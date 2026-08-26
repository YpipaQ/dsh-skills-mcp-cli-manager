import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import * as mcpClient from "@deepseek-ai/dsh-mcp-client";
//#region src/cli.ts
/**
* CLI manager — discovers the local command-line tools the agent can invoke
* and reports/diagnoses their state. Two sources:
*  - `skill`    : auto-discovered from a skill bundle that ships a
*                 `scripts/run-cli.*` / `scripts/cli-state.*` wrapper (the
*                 tencent-news pattern). The skill's `cli-state` script is the
*                 authoritative probe when present.
*  - `registry` : user-declared entries persisted in ~/.dsh/cli.json (mirrors
*                 the mcp.json document), e.g. `gh`, `git`, `tencent-news-cli`.
* Exists/path detection never spawns an untrusted binary (PATH walk only);
* a full state probe / subcommand listing runs the resolved command on demand.
* @module
*/
/** Coerce a cli-state boolean (JSON boolean or the string "true"/"false"). */
function toBool(value) {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const s = value.trim().toLowerCase();
		if (s === "true" || s === "1") return true;
		if (s === "false" || s === "0") return false;
	}
}
const IS_WIN = process.platform === "win32";
/** Known well-known tool names the plugin watches out of the box. */
const DEFAULT_REGISTRY = [
	{
		name: "gh",
		command: "gh",
		enabled: true
	},
	{
		name: "git",
		command: "git",
		enabled: true
	},
	{
		name: "tencent-news-cli",
		command: "tencent-news-cli",
		enabled: true
	}
];
/** The ~/.dsh/cli.json path this manager owns. */
function cliConfigPath() {
	return join(process.env.DSH_HOME || join(homedir(), ".dsh"), "cli.json");
}
/** Read the persisted registry document (never throws). */
function readCliConfig() {
	const target = cliConfigPath();
	try {
		if (!existsSync(target)) return { entries: [] };
		const raw = readFileSync(target, "utf8");
		if (!raw || raw.trim() === "") return { entries: [] };
		const data = JSON.parse(raw);
		return { entries: Array.isArray(data.entries) ? data.entries.filter((e) => e && typeof e.name === "string") : [] };
	} catch {
		return { entries: [] };
	}
}
/** Persist the registry document (creating the directory when needed). */
function writeCliConfig(data) {
	const target = cliConfigPath();
	mkdirSync(join(target, ".."), { recursive: true });
	writeFileSync(target, JSON.stringify(data, null, 2), "utf8");
}
/** Validate one registry entry; returns an error string, or null when valid. */
function validateCliEntry(entry) {
	if (!entry || typeof entry !== "object") return "entry must be an object";
	const e = entry;
	if (typeof e.name !== "string" || !/^[A-Za-z0-9_.-]{1,64}$/.test(e.name)) return "invalid name (1-64 chars of A-Za-z0-9_.-)";
	if (e.command !== void 0 && (typeof e.command !== "string" || e.command.trim() === "")) return "command must be a non-empty string";
	return null;
}
/** Normalize a registry entry to its persisted shape. */
function normalizeCliEntry(entry) {
	return {
		name: entry.name,
		command: typeof entry.command === "string" && entry.command.trim() !== "" ? entry.command : entry.name,
		enabled: entry.enabled !== false
	};
}
/** Walk PATH for an executable name without spawning it (portable, safe). */
function resolveOnPath(command) {
	const name = command.trim();
	if (name === "") return void 0;
	const dirs = (process.env.PATH || "").split(process.platform === "win32" ? ";" : ":").filter(Boolean);
	const exts = IS_WIN ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean) : [""];
	const candidates = IS_WIN ? [name, ...exts.map((ext) => name + ext.toLowerCase())] : [name];
	for (const dir of dirs) for (const cand of candidates) {
		const full = join(dir, cand);
		if (existsSync(full)) return full;
	}
}
/** Run a command synchronously, capturing stdout/stderr. */
function runSync(cmd, args, timeoutMs = 2e4) {
	try {
		const r = spawnSync(cmd, args, {
			encoding: "utf8",
			timeout: timeoutMs,
			windowsHide: true
		});
		return {
			ok: r.status === 0,
			out: (r.stdout || "").trim(),
			err: (r.stderr || "").trim() + (r.error && r.error.message ? `\n${r.error.message}` : "")
		};
	} catch (e) {
		return {
			ok: false,
			out: "",
			err: String(e)
		};
	}
}
/** Run a skill's `cli-state.*` probe script and parse its JSON document. */
function runCliStateScript(scriptPath) {
	const { ok, out, err } = runSync(IS_WIN ? "powershell" : "sh", IS_WIN ? [
		"-NoProfile",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		scriptPath
	] : [scriptPath]);
	if (!ok) try {
		return {
			ok: true,
			data: JSON.parse(out)
		};
	} catch {
		return {
			ok: false,
			data: null,
			error: err || out || "state script failed"
		};
	}
	try {
		return {
			ok: true,
			data: JSON.parse(out)
		};
	} catch {
		return {
			ok: false,
			data: null,
			error: "state script did not return JSON"
		};
	}
}
/** Extract the wrapped CLI command name from a skill's run-cli script. */
function cliCommandFromScript(scriptPath) {
	const raw = readFileSync(scriptPath, "utf8");
	const m = /^[ \t]*\$?[A-Za-z0-9_]*CliCommandName[ \t]*=[ \t]*["']([^"']+)["']/m.exec(raw);
	if (m) return m[1];
	return "";
}
/**
* Owns skill-derived CLI discovery plus the persisted registry. Runs in the
* Host process; only PATH walks happen during `list`, heavier probes on demand.
*/
var CliManager = class {
	skills;
	constructor(skills) {
		this.skills = skills;
	}
	/** One element of the merged CLI list, still independent of registry state. */
	skillEntries(cwd) {
		const items = [];
		for (const skill of this.skills.listSkills(cwd)) {
			const scriptsDir = join(skill.path.split(/[\\/]/).slice(0, -1).join("/"), "scripts");
			if (!existsSync(scriptsDir)) continue;
			const entries = readdirSync(scriptsDir, { withFileTypes: true });
			const scriptName = IS_WIN ? "run-cli.ps1" : "run-cli.sh";
			const stateName = IS_WIN ? "cli-state.ps1" : "cli-state.sh";
			const runScript = entries.some((e) => e.isFile() && e.name === scriptName) ? join(scriptsDir, scriptName) : void 0;
			const stateScript = entries.some((e) => e.isFile() && e.name === stateName) ? join(scriptsDir, stateName) : void 0;
			if (runScript === void 0 && stateScript === void 0) continue;
			const command = (runScript !== void 0 ? cliCommandFromScript(runScript) : "") || skill.name;
			if (command === "") continue;
			const resolved = resolveOnPath(command);
			const known = this.knownInstallPath(command);
			items.push({
				name: command,
				command,
				source: "skill",
				skill: skill.name,
				runScript,
				stateScript,
				enabled: true,
				exists: resolved !== void 0 || known !== void 0,
				path: resolved ?? known
			});
		}
		return items;
	}
	/** Registry entries mapped to summary form (path detection only). */
	registryEntries() {
		const config = readCliConfig();
		return (config.entries.length > 0 ? config.entries : DEFAULT_REGISTRY).map((e) => {
			const normalized = normalizeCliEntry(e);
			const resolved = resolveOnPath(normalized.command);
			return {
				name: normalized.name,
				command: normalized.command,
				source: "registry",
				enabled: normalized.enabled !== false,
				exists: resolved !== void 0,
				path: resolved
			};
		});
	}
	/** Merge skill-derived and registry CLI entries into the UI list. */
	list(cwd) {
		const byName = /* @__PURE__ */ new Map();
		for (const s of this.skillEntries(cwd)) byName.set(s.name, s);
		for (const r of this.registryEntries()) {
			if (byName.has(r.name)) continue;
			byName.set(r.name, r);
		}
		const items = [...byName.values()];
		items.sort((a, b) => {
			if (a.source !== b.source) return a.source === "skill" ? -1 : 1;
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});
		return items;
	}
	/** Probe one CLI's detailed state (cli-state script, else version). */
	async readState(name, cwd) {
		const found = this.list(cwd).find((s) => s.name === name);
		if (found === void 0) return {
			name,
			exists: false,
			error: "unknown cli: " + name
		};
		if (found.source === "skill" && found.stateScript && existsSync(found.stateScript)) {
			const { ok, data, error } = runCliStateScript(found.stateScript);
			if (ok && data) {
				const cliExists = toBool(data.cliExists) ?? false;
				const platform = data.platform ?? {};
				const update = data.update ?? {};
				const apiKey = data.apiKey ?? {};
				return {
					name,
					exists: cliExists,
					path: typeof platform.cliPath === "string" ? platform.cliPath : found.path,
					needUpdate: toBool(update.needUpdate),
					apiKey: {
						status: typeof apiKey.status === "string" ? apiKey.status : void 0,
						present: toBool(apiKey.present),
						error: typeof apiKey.error === "string" ? apiKey.error : void 0
					},
					platform: {
						os: typeof platform.os === "string" ? platform.os : void 0,
						arch: typeof platform.arch === "string" ? platform.arch : void 0,
						cliPath: typeof platform.cliPath === "string" ? platform.cliPath : void 0,
						cliSource: typeof platform.cliSource === "string" ? platform.cliSource : void 0
					}
				};
			}
			const generic = this.genericState(found);
			Object.assign(generic, { error });
			return generic;
		}
		return this.genericState(found);
	}
	/** Generic version probe for a non-skill CLI. */
	genericState(s) {
		const resolved = s.path ?? resolveOnPath(s.command);
		if (resolved === void 0) {
			const known = this.knownInstallPath(s.command);
			if (known !== void 0) {
				const r = runSync(known, ["--version"]);
				return {
					name: s.name,
					exists: true,
					path: known,
					version: r.ok ? r.out.split("\n")[0] : void 0,
					error: r.ok ? void 0 : r.err || "version check failed"
				};
			}
			return {
				name: s.name,
				exists: false
			};
		}
		for (const [flag, rest] of [["--version", []], ["version", []]]) {
			const r = runSync(resolved, [flag, ...rest]);
			if (r.ok && r.out) return {
				name: s.name,
				exists: true,
				path: resolved,
				version: r.out.split("\n")[0]
			};
		}
		return {
			name: s.name,
			exists: true,
			path: resolved,
			error: "version not reported"
		};
	}
	/** Best-effort known install path for a tool installed outside PATH. */
	knownInstallPath(command) {
		if (command === "tencent-news-cli") {
			const root = process.env.TENCENT_NEWS_INSTALL || join(homedir(), ".tencent-news-cli");
			const bin = IS_WIN ? join(root, "bin", "tencent-news-cli.exe") : join(root, "bin", "tencent-news-cli");
			return existsSync(bin) ? bin : void 0;
		}
	}
	/** Parse a CLI's `help` output into its subcommand list. */
	async listSubcommands(name, cwd) {
		const found = this.list(cwd).find((s) => s.name === name);
		if (found === void 0) throw new Error("unknown cli: " + name);
		const command = found.path ?? resolveOnPath(found.command) ?? this.knownInstallPath(found.command) ?? found.command;
		let helpOut = "";
		if (found.source === "skill" && found.runScript && existsSync(found.runScript)) {
			const r = runSync(IS_WIN ? "powershell" : "sh", IS_WIN ? [
				"-NoProfile",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				found.runScript,
				"help"
			] : [found.runScript, "help"]);
			helpOut = r.out || r.err;
		} else {
			const r = runSync(command, ["help"]);
			if (!r.ok) {
				const r2 = runSync(command, ["--help"]);
				helpOut = r2.out || r2.err || r.out || r.err;
			} else helpOut = r.out;
		}
		const subcommands = parseHelpCommands(helpOut);
		return {
			name,
			command: found.command,
			subcommands,
			help: helpOut
		};
	}
	/** Registry mutation: upsert one entry. */
	saveEntry(entry) {
		const normalized = normalizeCliEntry(entry);
		const config = readCliConfig();
		const idx = config.entries.findIndex((e) => e.name === normalized.name);
		if (idx >= 0) config.entries[idx] = normalized;
		else config.entries.push(normalized);
		writeCliConfig(config);
		return normalized;
	}
	/** Registry mutation: set the enabled flag. */
	setEnabled(name, enabled) {
		const config = readCliConfig();
		const entry = config.entries.find((e) => e.name === name);
		if (entry === void 0) return;
		entry.enabled = enabled;
		writeCliConfig(config);
	}
	/** Registry mutation: remove one entry. */
	removeEntry(name) {
		const config = readCliConfig();
		config.entries = config.entries.filter((e) => e.name !== name);
		writeCliConfig(config);
	}
};
/** Parse `Available Commands:` / `Commands:` block into a subcommand list. */
function parseHelpCommands(help) {
	const lines = help.split(/\r?\n/);
	const result = [];
	let capture = false;
	for (const line of lines) {
		const trimmed = line.trim();
		if (/^(available commands|commands):\s*$/i.test(trimmed)) {
			capture = true;
			continue;
		}
		if (capture) {
			if (trimmed === "") break;
			const m = /^([a-z][a-z0-9_-]*)/i.exec(trimmed);
			if (m && !/^usage|^flags|^help/i.test(m[1])) result.push(m[1]);
		}
	}
	return result;
}
//#endregion
//#region src/mcp.ts
/** Defaults for the mcp-client connection (per-call timeout + reconnect policy). */
const TOOL_CALL_TIMEOUT_MS = 6e4;
const RECONNECT = {
	enabled: true,
	initialDelayMs: 500,
	maxDelayMs: 3e4,
	maxAttempts: 10
};
/** The ~/.dsh/mcp.json path this manager owns. */
function mcpConfigPath() {
	return join(process.env.DSH_HOME || join(homedir(), ".dsh"), "mcp.json");
}
/** Read the persisted servers document (never throws). */
function readMcpConfig() {
	const target = mcpConfigPath();
	try {
		if (!existsSync(target)) return { servers: [] };
		const raw = readFileSync(target, "utf8");
		if (!raw || raw.trim() === "") return { servers: [] };
		const data = JSON.parse(raw);
		return { servers: Array.isArray(data.servers) ? data.servers : [] };
	} catch {
		return { servers: [] };
	}
}
/** Persist the servers document (creating the directory when needed). */
function writeMcpConfig(data) {
	const target = mcpConfigPath();
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, JSON.stringify(data, null, 2), "utf8");
}
/** Validate one server definition; returns an error string, or null when valid. */
function validateMcpServer(server) {
	if (!server || typeof server !== "object") return "server must be an object";
	const s = server;
	const name = s.name;
	if (typeof name !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(name)) return "invalid name (1-32 chars of A-Za-z0-9_-)";
	if (s.transport !== "stdio" && s.transport !== "streamable-http") return "transport must be 'stdio' or 'streamable-http'";
	if (s.transport === "stdio" && (typeof s.command !== "string" || s.command.trim() === "")) return "stdio transport requires command";
	if (s.transport === "streamable-http" && (typeof s.url !== "string" || s.url.trim() === "")) return "streamable-http transport requires url";
	return null;
}
/** Normalize a server into its persisted shape (drop transport-irrelevant fields). */
function normalizeMcpServer(server) {
	const normalized = {
		name: server.name,
		transport: server.transport,
		enabled: server.enabled !== false
	};
	if (server.transport === "stdio") {
		normalized.command = server.command;
		normalized.args = Array.isArray(server.args) ? server.args : [];
		normalized.env = server.env && typeof server.env === "object" && !Array.isArray(server.env) ? server.env : {};
		normalized.cwd = server.cwd || "";
	} else {
		normalized.url = server.url;
		normalized.headers = server.headers && typeof server.headers === "object" && !Array.isArray(server.headers) ? server.headers : {};
	}
	return normalized;
}
/** Map a persisted server definition to the mcp-client plugin Config. */
function toMcpClientConfig(s) {
	const base = {
		serverName: s.name,
		toolCallTimeoutMs: TOOL_CALL_TIMEOUT_MS,
		failOnStartupError: true,
		reconnect: RECONNECT
	};
	if (s.transport === "stdio") return {
		...base,
		transport: "stdio",
		command: s.command ?? "",
		args: s.args ?? [],
		env: s.env ?? {},
		cwd: s.cwd ?? ""
	};
	return {
		...base,
		transport: "streamable-http",
		url: s.url ?? "",
		headers: s.headers ?? {}
	};
}
/** Equality for re-connect decisions (config-relevant fields only). */
function configChanged(a, b) {
	return JSON.stringify(normalizeMcpServer(a)) !== JSON.stringify(normalizeMcpServer(b));
}
/**
* Owns the live mcp-client fibers keyed by server name. Loading/disposal is
* effect-safe: dispose() tears every fiber down (disconnect + tool unregister).
*/
var McpManager = class {
	ctx;
	live = /* @__PURE__ */ new Map();
	statuses = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
	}
	/** Re-read the persisted document and converge the live fiber set onto it. */
	async reload() {
		await this.sync(readMcpConfig().servers);
	}
	/**
	* Converge the live fiber set onto the given enabled server list: dispose
	* removed/changed/disabled servers, then connect newly-enabled ones.
	* @param servers - the complete next server list (enabled flag respected).
	*/
	async sync(servers) {
		const next = /* @__PURE__ */ new Map();
		for (const s of servers) if (s.enabled !== false) next.set(s.name, s);
		for (const [name, entry] of [...this.live]) {
			const target = next.get(name);
			if (target === void 0 || configChanged(entry.config, target)) {
				this.live.delete(name);
				this.statuses.delete(name);
				try {
					await entry.fiber.dispose();
				} catch {}
			}
		}
		for (const [name, cfg] of next) {
			if (this.live.has(name)) continue;
			this.statuses.set(name, { status: "connecting" });
			let fiber;
			try {
				fiber = this.ctx.plugin(mcpClient, toMcpClientConfig(cfg));
			} catch (e) {
				this.statuses.set(name, {
					status: "failed",
					error: String(e?.message ?? e)
				});
				continue;
			}
			this.live.set(name, {
				config: normalizeMcpServer(cfg),
				fiber
			});
			fiber.then(() => {
				this.statuses.set(name, { status: "running" });
			}, (e) => {
				this.live.delete(name);
				this.statuses.set(name, {
					status: "failed",
					error: String(e?.message ?? e)
				});
			});
		}
	}
	/** Stop and dispose every live connection (plugin teardown). */
	async dispose() {
		for (const [name, entry] of [...this.live]) {
			this.live.delete(name);
			this.statuses.delete(name);
			try {
				await entry.fiber.dispose();
			} catch {}
		}
	}
	/**
	* One-shot connection probe for the test button: connect with
	* failOnStartupError so a failure rejects, then always dispose. A server
	* that is already live answers ok immediately — re-testing would collide on
	* its reserved serverName namespace.
	*/
	async testConnect(server) {
		const normalized = normalizeMcpServer(server);
		if (this.live.has(normalized.name)) return { ok: true };
		const fiber = this.ctx.plugin(mcpClient, toMcpClientConfig(normalized));
		try {
			await fiber;
			return { ok: true };
		} catch (e) {
			return {
				ok: false,
				error: String(e?.message ?? e)
			};
		} finally {
			try {
				await fiber.dispose();
			} catch {}
		}
	}
	/** Build the UI summary list (persisted config + live status). */
	summarize(servers) {
		return servers.map((s) => {
			const st = this.statuses.get(s.name);
			const enabled = s.enabled !== false;
			const status = !enabled ? "stopped" : st?.status ?? "connecting";
			return {
				...s,
				enabled,
				status,
				error: st?.error
			};
		});
	}
};
//#endregion
//#region src/protocol.ts
/** API paths shared by the host routes and the browser api client. */
const SKILLS_MCP_API = {
	skills: "/api/dsh-skills-mcp/skills",
	skillRead: "/api/dsh-skills-mcp/skills/read",
	skillToggle: "/api/dsh-skills-mcp/skills/toggle",
	skillDelete: "/api/dsh-skills-mcp/skills/delete",
	skillScan: "/api/dsh-skills-mcp/skills/scan",
	skillImport: "/api/dsh-skills-mcp/skills/import",
	mcp: "/api/dsh-skills-mcp/mcp",
	mcpSave: "/api/dsh-skills-mcp/mcp/save",
	mcpEnabled: "/api/dsh-skills-mcp/mcp/enabled",
	mcpDelete: "/api/dsh-skills-mcp/mcp/delete",
	mcpTest: "/api/dsh-skills-mcp/mcp/test",
	cli: "/api/dsh-skills-mcp/cli",
	cliState: "/api/dsh-skills-mcp/cli/state",
	cliSubcommands: "/api/dsh-skills-mcp/cli/subcommands",
	cliSave: "/api/dsh-skills-mcp/cli/save",
	cliEnabled: "/api/dsh-skills-mcp/cli/enabled",
	cliDelete: "/api/dsh-skills-mcp/cli/delete",
	cliProbe: "/api/dsh-skills-mcp/cli/probe"
};
//#endregion
//#region src/routes.ts
/** Cap on JSON request bodies (server definitions and import lists are small). */
const MAX_JSON_BODY_BYTES = 1024 * 1024;
function isLoopbackRequest(request) {
	const address = request.socket.remoteAddress;
	if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL("http://" + host);
	} catch {
		return false;
	}
	if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
function writeJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"referrer-policy": "no-referrer"
	});
	res.end(JSON.stringify(body));
}
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_JSON_BODY_BYTES) return void 0;
		chunks.push(buffer);
	}
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return typeof parsed === "object" && parsed !== null ? parsed : void 0;
	} catch {
		return;
	}
}
function queryParam(url, name) {
	const value = url.searchParams.get(name);
	return value === null ? void 0 : value;
}
/**
* Build every /api/dsh-skills-mcp route (exact paths).
* @param deps - skills engine, MCP connection manager, and CLI manager.
* @returns the route registrations.
*/
function makeRoutes(deps) {
	const { skills, mcp, cli } = deps;
	const guard = (req, res, method) => {
		if (!isLoopbackRequest(req)) {
			writeJson(res, 403, {
				ok: false,
				error: "forbidden: loopback-only"
			});
			return false;
		}
		if (req.method !== method) {
			writeJson(res, 405, {
				ok: false,
				error: "method not allowed"
			});
			return false;
		}
		return true;
	};
	const handle = (method, path, fn) => ({
		kind: "exact",
		path,
		handler: async (req, res) => {
			if (!guard(req, res, method)) return;
			let body = {};
			if (method === "POST") {
				const parsed = await readJsonBody(req);
				if (parsed === void 0) {
					writeJson(res, 400, {
						ok: false,
						error: "invalid or oversized JSON body"
					});
					return;
				}
				body = parsed;
			}
			try {
				await fn(req, res, body, new URL(req.url ?? "/", "http://localhost"));
			} catch (e) {
				writeJson(res, 500, {
					ok: false,
					error: String(e?.message ?? e)
				});
			}
		}
	});
	const ok = (data = {}) => ({
		ok: true,
		...data
	});
	return { routes: [
		handle("GET", SKILLS_MCP_API.skills, async (_req, res, _body, url) => {
			writeJson(res, 200, ok({ items: skills.listSkills(queryParam(url, "cwd")) }));
		}),
		handle("POST", SKILLS_MCP_API.skillRead, async (_req, res, body, _url) => {
			const path = typeof body?.path === "string" ? body.path : "";
			if (!path) {
				writeJson(res, 400, {
					ok: false,
					error: "path required"
				});
				return;
			}
			const skill = skills.readSkill(path);
			if (skill === null) {
				writeJson(res, 404, {
					ok: false,
					error: "not a valid skill file: " + path
				});
				return;
			}
			writeJson(res, 200, ok({ skill }));
		}),
		handle("POST", SKILLS_MCP_API.skillToggle, async (_req, res, body, _url) => {
			const path = typeof body?.path === "string" ? body.path : "";
			if (!path) {
				writeJson(res, 400, {
					ok: false,
					error: "path required"
				});
				return;
			}
			const enabled = body.enabled === true;
			skills.setSkillEnabled(path, enabled);
			writeJson(res, 200, ok({
				path,
				enabled
			}));
		}),
		handle("POST", SKILLS_MCP_API.skillDelete, async (_req, res, body, _url) => {
			const path = typeof body?.path === "string" ? body.path : "";
			if (!path) {
				writeJson(res, 400, {
					ok: false,
					error: "path required"
				});
				return;
			}
			const kind = body.kind === "bundle" ? "bundle" : "file";
			const removed = skills.deleteSkill(path, kind);
			writeJson(res, 200, ok({
				path,
				removed
			}));
		}),
		handle("POST", SKILLS_MCP_API.skillScan, async (_req, res, body, _url) => {
			const dir = typeof body?.dir === "string" ? body.dir : "";
			if (!dir) {
				writeJson(res, 400, {
					ok: false,
					error: "directory is required"
				});
				return;
			}
			writeJson(res, 200, ok({ items: skills.scanSkills(dir) }));
		}),
		handle("POST", SKILLS_MCP_API.skillImport, async (_req, res, body, _url) => {
			const items = Array.isArray(body?.items) ? body.items : [];
			if (items.length === 0) {
				writeJson(res, 400, {
					ok: false,
					error: "nothing selected"
				});
				return;
			}
			const results = skills.importSkills(items.map((it) => ({
				sourcePath: typeof it.sourcePath === "string" ? it.sourcePath : "",
				kind: it.kind === "bundle" ? "bundle" : "file"
			})));
			writeJson(res, 200, ok({ results }));
		}),
		handle("GET", SKILLS_MCP_API.mcp, async (_req, res, _body, _url) => {
			const { servers } = readMcpConfig();
			writeJson(res, 200, ok({ servers: mcp.summarize(servers) }));
		}),
		handle("POST", SKILLS_MCP_API.mcpSave, async (_req, res, body, _url) => {
			const server = body?.server;
			const err = validateMcpServer(server);
			if (err) {
				writeJson(res, 400, {
					ok: false,
					error: err
				});
				return;
			}
			const normalized = normalizeMcpServer(server);
			const data = readMcpConfig();
			const idx = data.servers.findIndex((s) => s.name === normalized.name);
			if (idx >= 0) data.servers[idx] = normalized;
			else data.servers.push(normalized);
			writeMcpConfig(data);
			await mcp.sync(data.servers);
			writeJson(res, 200, ok({ server: normalized }));
		}),
		handle("POST", SKILLS_MCP_API.mcpEnabled, async (_req, res, body, _url) => {
			const name = typeof body?.name === "string" ? body.name : "";
			const enabled = body.enabled === true;
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			const data = readMcpConfig();
			const s = data.servers.find((x) => x.name === name);
			if (s === void 0) {
				writeJson(res, 404, {
					ok: false,
					error: "server not found: " + name
				});
				return;
			}
			s.enabled = enabled;
			writeMcpConfig(data);
			await mcp.sync(data.servers);
			writeJson(res, 200, ok({
				name,
				enabled
			}));
		}),
		handle("POST", SKILLS_MCP_API.mcpDelete, async (_req, res, body, _url) => {
			const name = typeof body?.name === "string" ? body.name : "";
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			const data = readMcpConfig();
			data.servers = data.servers.filter((x) => x.name !== name);
			writeMcpConfig(data);
			await mcp.sync(data.servers);
			writeJson(res, 200, ok({ name }));
		}),
		handle("POST", SKILLS_MCP_API.mcpTest, async (_req, res, body, _url) => {
			const server = body?.server;
			const err = validateMcpServer(server);
			if (err) {
				writeJson(res, 400, {
					ok: false,
					error: err
				});
				return;
			}
			const result = await mcp.testConnect(server);
			writeJson(res, 200, ok({ test: result }));
		}),
		handle("GET", SKILLS_MCP_API.cli, async (_req, res, _body, url) => {
			writeJson(res, 200, ok({ items: cli.list(queryParam(url, "cwd")) }));
		}),
		handle("GET", SKILLS_MCP_API.cliState, async (_req, res, _body, url) => {
			const name = queryParam(url, "name") ?? "";
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			const state = await cli.readState(name, queryParam(url, "cwd"));
			writeJson(res, 200, ok({ state }));
		}),
		handle("GET", SKILLS_MCP_API.cliSubcommands, async (_req, res, _body, url) => {
			const name = queryParam(url, "name") ?? "";
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			const subcommands = await cli.listSubcommands(name, queryParam(url, "cwd"));
			writeJson(res, 200, ok({ subcommands }));
		}),
		handle("POST", SKILLS_MCP_API.cliSave, async (_req, res, body, _url) => {
			const entry = body?.entry;
			const err = validateCliEntry(entry);
			if (err) {
				writeJson(res, 400, {
					ok: false,
					error: err
				});
				return;
			}
			const normalized = cli.saveEntry(entry);
			writeJson(res, 200, ok({ entry: normalized }));
		}),
		handle("POST", SKILLS_MCP_API.cliEnabled, async (_req, res, body, _url) => {
			const name = typeof body?.name === "string" ? body.name : "";
			const enabled = body.enabled === true;
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			cli.setEnabled(name, enabled);
			writeJson(res, 200, ok({
				name,
				enabled
			}));
		}),
		handle("POST", SKILLS_MCP_API.cliDelete, async (_req, res, body, _url) => {
			const name = typeof body?.name === "string" ? body.name : "";
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			cli.removeEntry(name);
			writeJson(res, 200, ok({ name }));
		}),
		handle("POST", SKILLS_MCP_API.cliProbe, async (_req, res, body, _url) => {
			const name = typeof body?.name === "string" ? body.name : "";
			if (!name) {
				writeJson(res, 400, {
					ok: false,
					error: "name required"
				});
				return;
			}
			const cwd = typeof body?.cwd === "string" ? body.cwd : void 0;
			const state = await cli.readState(name, cwd);
			const subcommands = await cli.listSubcommands(name, cwd);
			writeJson(res, 200, ok({
				state,
				subcommands
			}));
		})
	] };
}
//#endregion
//#region src/skills.ts
/**
* Skills filesystem engine — scans the four manageable skill roots, parses
* SKILL.md frontmatter, and performs enable/disable (frontmatter rewrite),
* delete, scan-for-import, and import. Runs in the Host process with direct
* node:fs access (a real npm package no longer needs the shell+node hack the
* dynamic plugin used).
* @module
*/
function dshHomeDir() {
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}
function agentsHomeDir() {
	return process.env.DSH_AGENTS_HOME || join(homedir(), ".agents");
}
/** Resolve (and materialize) the user-level skill roots. */
function getRoots() {
	const home = homedir();
	const dshHome = dshHomeDir();
	const agentsHome = agentsHomeDir();
	const userSkillsDir = join(dshHome, "skills");
	mkdirSync(userSkillsDir, { recursive: true });
	return {
		home,
		dshHome,
		agentsHome,
		userSkillsDir,
		agentsSkillsDir: join(agentsHome, "skills")
	};
}
/** Walk up from cwd to the nearest .git directory (the project root). */
function findProjectRoot(cwd) {
	let dir = resolve(cwd ?? process.cwd());
	for (let i = 0; i < 100; i++) {
		if (existsSync(join(dir, ".git"))) break;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return dir;
}
function levelOf(source) {
	return source === "project-dsh" || source === "project-agents" ? "project" : "user";
}
function scalarValue(v) {
	if (v === "true" || v === "True" || v === "TRUE") return true;
	if (v === "false" || v === "False" || v === "FALSE") return false;
	if (v === "null" || v === "~") return null;
	if (/^-?\d+$/.test(v)) return parseInt(v, 10);
	return v;
}
function parseBool(v) {
	if (v === true || v === 1 || v === "1") return true;
	if (v === false || v === 0 || v === "0") return false;
	if (typeof v === "string") {
		const s = v.toLowerCase();
		if (s === "true" || s === "yes" || s === "on") return true;
		if (s === "false" || s === "no" || s === "off") return false;
	}
}
/** Parse a YAML-style frontmatter block; null when absent or malformed. */
function parseFrontmatter(raw) {
	const lines = raw.split(/\r?\n/);
	if (lines.length === 0 || lines[0].trim() !== "---") return null;
	let closeIdx = -1;
	for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") {
		closeIdx = i;
		break;
	}
	if (closeIdx < 0) return null;
	const data = {};
	for (let i = 1; i < closeIdx; i++) {
		const line = lines[i];
		const colon = line.indexOf(":");
		if (colon < 0) continue;
		const key = line.slice(0, colon).trim();
		let val = line.slice(colon + 1).trim();
		if (val.length >= 2 && (val[0] === "\"" && val[val.length - 1] === "\"" || val[0] === "'" && val[val.length - 1] === "'")) val = val.slice(1, -1);
		data[key] = scalarValue(val);
	}
	return {
		data,
		body: lines.slice(closeIdx + 1).join("\n")
	};
}
/** Parse one skill document; null when it lacks a name/description. */
function parseSkillFile(raw) {
	const fm = parseFrontmatter(raw);
	if (fm === null) return null;
	const name = typeof fm.data.name === "string" ? fm.data.name : "";
	const description = typeof fm.data.description === "string" ? fm.data.description : "";
	if (name === "" || description === "") return null;
	const whenToUse = typeof fm.data.whenToUse === "string" ? fm.data.whenToUse : "";
	const disableModel = parseBool(fm.data["disable-model-invocation"]);
	const userInvocable = parseBool(fm.data["user-invocable"]);
	return {
		name,
		description,
		whenToUse,
		enabled: disableModel !== true || userInvocable !== false,
		content: fm.body.trim()
	};
}
/** Rewrite the frontmatter to add/remove the disable-model-invocation pair. */
function toggleInvocation(raw, enabled) {
	const lines = raw.split(/\r?\n/);
	if (lines.length === 0 || lines[0].trim() !== "---") return raw;
	let closeIdx = -1;
	for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") {
		closeIdx = i;
		break;
	}
	if (closeIdx < 0) return raw;
	const kept = lines.slice(1, closeIdx).filter((l) => {
		return !/^\s*(disable-model-invocation|disableModelInvocation|modelInvocable|user-invocable|userInvocable)\s*:/.test(l);
	});
	if (!enabled) {
		kept.push("disable-model-invocation: true");
		kept.push("user-invocable: false");
	}
	return [lines[0]].concat(kept, lines.slice(closeIdx)).join("\n");
}
var SkillsManager = class {
	/** Scan one skill root directory into SkillSummary records. */
	scanRoot(dir, source) {
		const items = [];
		if (!existsSync(dir)) return items;
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return items;
		}
		for (const entry of entries) {
			const name = entry.name;
			if (!name || name === ".system" || name[0] === ".") continue;
			if (entry.isDirectory()) {
				const mdPath = join(dir, name, "SKILL.md");
				if (!existsSync(mdPath)) continue;
				let raw;
				try {
					raw = readFileSync(mdPath, "utf8");
				} catch {
					continue;
				}
				const parsed = parseSkillFile(raw);
				if (parsed === null) continue;
				items.push({
					...parsed,
					source,
					level: levelOf(source),
					kind: "bundle",
					path: mdPath
				});
			} else if (entry.isFile() && name.endsWith(".md")) {
				const filePath = join(dir, name);
				let raw;
				try {
					raw = readFileSync(filePath, "utf8");
				} catch {
					continue;
				}
				const parsed = parseSkillFile(raw);
				if (parsed === null) continue;
				items.push({
					...parsed,
					source,
					level: levelOf(source),
					kind: "file",
					path: filePath
				});
			}
		}
		return items;
	}
	/** List skills across project and/or user roots, de-duplicated by path. */
	listSkills(cwd) {
		const roots = getRoots();
		const scans = [];
		if (cwd) {
			const projectRoot = findProjectRoot(cwd);
			scans.push({
				path: join(projectRoot, ".dsh", "skills"),
				source: "project-dsh"
			}, {
				path: join(projectRoot, ".agents", "skills"),
				source: "project-agents"
			}, {
				path: roots.userSkillsDir,
				source: "user-dsh"
			}, {
				path: roots.agentsSkillsDir,
				source: "user-agents"
			});
		} else scans.push({
			path: roots.userSkillsDir,
			source: "user-dsh"
		}, {
			path: roots.agentsSkillsDir,
			source: "user-agents"
		});
		const seen = /* @__PURE__ */ new Set();
		const items = [];
		for (const s of scans) for (const it of this.scanRoot(s.path, s.source)) {
			if (seen.has(it.path)) continue;
			seen.add(it.path);
			items.push(it);
		}
		items.sort((a, b) => {
			if (a.level !== b.level) return a.level === "project" ? -1 : 1;
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});
		return items;
	}
	/** Read one skill document (body included). */
	readSkill(path) {
		if (!existsSync(path)) return null;
		const parsed = parseSkillFile(readFileSync(path, "utf8"));
		if (parsed === null) return null;
		return {
			...parsed,
			path
		};
	}
	/** Enable/disable a skill by rewriting its frontmatter invocation flags. */
	setSkillEnabled(path, enabled) {
		writeFileSync(path, toggleInvocation(readFileSync(path, "utf8"), enabled), "utf8");
	}
	/** Delete a skill (the whole bundle directory, or the flat .md file). */
	deleteSkill(path, kind) {
		const target = kind === "bundle" ? dirname(path) : path;
		rmSync(target, {
			recursive: true,
			force: true
		});
		return target;
	}
	/** Scan an arbitrary directory for importable skills. */
	scanSkills(dir) {
		if (!existsSync(dir)) throw new Error("directory not found: " + dir);
		const entries = readdirSync(dir, { withFileTypes: true });
		const items = [];
		for (const entry of entries) {
			const name = entry.name;
			if (!name || name[0] === ".") continue;
			if (entry.isDirectory()) {
				const mdPath = join(dir, name, "SKILL.md");
				if (!existsSync(mdPath)) continue;
				let raw;
				try {
					raw = readFileSync(mdPath, "utf8");
				} catch {
					continue;
				}
				const parsed = parseSkillFile(raw);
				if (parsed !== null) items.push({
					name: parsed.name,
					description: parsed.description,
					sourcePath: join(dir, name),
					kind: "bundle"
				});
			} else if (entry.isFile() && name.endsWith(".md") && name !== "SKILL.md") {
				let raw;
				try {
					raw = readFileSync(join(dir, name), "utf8");
				} catch {
					continue;
				}
				const parsed = parseSkillFile(raw);
				if (parsed !== null) items.push({
					name: parsed.name,
					description: parsed.description,
					sourcePath: join(dir, name),
					kind: "file"
				});
			}
		}
		return items;
	}
	/** Import selected skills into ~/.dsh/skills (skip names that already exist). */
	importSkills(items) {
		const destDir = getRoots().userSkillsDir;
		mkdirSync(destDir, { recursive: true });
		const results = [];
		for (const it of items) {
			const base = join(destDir, it.sourcePath.split(/[\\/]/).pop() || "");
			if (existsSync(base)) {
				results.push({
					name: base,
					ok: false,
					reason: "already exists"
				});
				continue;
			}
			try {
				if (it.kind === "bundle") cpSync(it.sourcePath, base, { recursive: true });
				else copyFileSync(it.sourcePath, base);
				results.push({
					name: base,
					ok: true
				});
			} catch (e) {
				results.push({
					name: base,
					ok: false,
					reason: String(e?.message ?? e)
				});
			}
		}
		return results;
	}
};
//#endregion
//#region src/index.ts
/** Stable cordis plugin name. */
const name = "skills-mcp-manager";
/** Services required before the surfaces can mount. `settings` is
* deliberately absent: installSettingsSection registers it on an inner scoped
* fiber, so a deployment without the settings surface still gets routes + MCP. */
const inject = [
	"webServer",
	"tools",
	"systemPrompt"
];
/**
* Settings namespace this plugin's config lives under. Spelled here rather
* than imported: the browser half spells the same value and must not depend
* on a Host package.
*/
const SKILLS_MCP_NAMESPACE = settingsNamespace("skills-mcp-manager");
const Config = z.object({
	enabled: z.boolean().default(true),
	announceToAgent: z.boolean().default(true)
});
const DEFAULT_ENABLED = true;
const DEFAULT_ANNOUNCE = true;
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 160;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const SKILLS_MCP_GUIDANCE = "本机已安装 dsh-skills-mcp-cli-manager 插件（技能中心：技能 / MCP / CLI 管理器）：设置页「Web UI 插件 → 技能中心」。能力：浏览/启用/禁用/删除/导入技能（项目级 .dsh/skills、.agents/skills 与用户级 ~/.dsh/skills、~/.agents/skills）；管理 MCP 服务器（stdio 与 streamable-http）；以及本地 CLI 工具清单与状态（发现 skill 内嵌的 CLI 包装脚本如 scripts/run-cli、以及系统 CLI 如 gh/git/tencent-news-cli，报告是否安装/版本/需更新/子命令/API-Key 状态）。MCP 是真实连接：启用的服务器经 @deepseek-ai/dsh-mcp-client 真正连接并把工具注册为 mcp__<server>__<tool>，启用/禁用会实际连接/断开。限制：MCP 服务器配置存 ~/.dsh/mcp.json（密码/env 明文、权限 0600 由用户自行保证）；CLI 注册表存 ~/.dsh/cli.json；技能启用/禁用通过改写 SKILL.md 前言实现；删除为物理删除，不可恢复。用户提到「技能管理 / 技能导入 / MCP 服务器 / MCP 连接 / CLI 工具 / CLI 状态」时即指本插件，请据此协作。";
/**
* Mount the skills engine, MCP manager, routes, and announcement.
* @param ctx - host plugin context carrying settings/webServer/tools/systemPrompt.
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
function apply(ctx, config) {
	let current = () => config ?? {};
	const resolve = () => ({
		enabled: current().enabled ?? DEFAULT_ENABLED,
		announceToAgent: current().announceToAgent ?? DEFAULT_ANNOUNCE
	});
	const skills = new SkillsManager();
	const mcp = new McpManager(ctx);
	const { routes } = makeRoutes({
		skills,
		mcp,
		cli: new CliManager(skills)
	});
	let disposeSection;
	let disposeRoutes;
	const sync = () => {
		const value = resolve();
		if (disposeSection !== void 0) {
			disposeSection();
			disposeSection = void 0;
		}
		if (disposeRoutes !== void 0) {
			disposeRoutes();
			disposeRoutes = void 0;
		}
		if (!value.enabled) {
			mcp.dispose();
			return;
		}
		if (value.announceToAgent) disposeSection = ctx.systemPrompt.section({
			name: "plugin:skills-mcp-manager",
			order: SECTION_ORDER,
			text: SKILLS_MCP_GUIDANCE
		});
		disposeRoutes = ctx.effect(() => {
			const disposers = routes.map((route) => ctx.webServer.register(route));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "skills-mcp-manager: routes");
		mcp.reload();
	};
	installSettingsSection(ctx, SKILLS_MCP_NAMESPACE, Config, config ?? {}, {
		setSource: (source) => {
			current = source;
			sync();
		},
		onChange: sync
	});
	ctx.effect(() => () => {
		mcp.dispose();
	}, "skills-mcp-manager: mcp");
	sync();
}
//#endregion
export { Config, SKILLS_MCP_GUIDANCE, SKILLS_MCP_NAMESPACE, apply, inject, name };
