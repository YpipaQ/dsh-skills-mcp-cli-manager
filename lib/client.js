window.__ModuleLoader__.load({
	id: "dsh-skills-mcp-cli-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			title: "技能中心",
			description: "管理技能、MCP 服务器与本地 CLI 工具（MCP 为真实连接）。",
			expand: "展开",
			collapse: "收起",
			notExposed: "当前部署未向此客户端提供该插件的设置命名空间。",
			readOnly: "设置文档为只读，无法保存更改。",
			unsaved: "未保存",
			discard: "放弃更改",
			save: "保存",
			saving: "保存中…",
			saveFailed: "保存未成功，请重试。",
			inherit: "继承",
			overridden: "已覆盖",
			reset: "重置",
			invalid: "输入无效",
			enabled: "启用插件",
			enabledHint: "关闭后，路由与 MCP 连接会全部停止。",
			announce: "向 Agent 公告",
			announceHint: "在系统提示中向每个 Agent 说明本插件的存在与能力。",
			on: "开",
			off: "关"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			title: "Skills Center",
			description: "Manage skills, MCP servers and local CLI tools (MCP connects for real).",
			expand: "Show",
			collapse: "Hide",
			notExposed: "This deployment does not expose the plugin settings namespace to this client.",
			readOnly: "The settings document is read-only; changes cannot be saved.",
			unsaved: "Unsaved",
			discard: "Discard",
			save: "Save",
			saving: "Saving…",
			saveFailed: "The save did not land; please retry.",
			inherit: "Inherit",
			overridden: "Overridden",
			reset: "Reset",
			invalid: "Invalid",
			enabled: "Enable plugin",
			enabledHint: "When off, routes and MCP connections all stop.",
			announce: "Announce to agent",
			announceHint: "Describe this plugin and its capabilities in every agent system prompt.",
			on: "On",
			off: "Off"
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
		//#region src/client/api.ts
		/**
		* Browser-side API client for the /api/dsh-skills-mcp route family. The only
		* data path the card components use — plain fetch, same origin.
		*/
		/** Error carrying the route's JSON error message. */
		var SkillsMcpApiError = class extends Error {
			constructor(message) {
				super(message);
				this.name = "SkillsMcpApiError";
			}
		};
		async function readJson(response) {
			let body;
			try {
				body = await response.json();
			} catch {
				throw new SkillsMcpApiError("HTTP " + response.status + ": invalid JSON response");
			}
			if (!response.ok) throw new SkillsMcpApiError(typeof body === "object" && body !== null && typeof body.error === "string" ? body.error : "HTTP " + response.status);
			return body;
		}
		async function post(path, payload) {
			return readJson(await fetch(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload)
			}));
		}
		async function get(path) {
			return readJson(await fetch(path));
		}
		/** The browser half's only data entry point. */
		var SkillsMcpApi = class {
			async listSkills(cwd) {
				const q = cwd ? "?cwd=" + encodeURIComponent(cwd) : "";
				return (await get(SKILLS_MCP_API.skills + q)).items;
			}
			async readSkill(path) {
				return (await post(SKILLS_MCP_API.skillRead, { path })).skill;
			}
			async toggleSkill(path, enabled) {
				await post(SKILLS_MCP_API.skillToggle, {
					path,
					enabled
				});
			}
			async deleteSkill(path, kind) {
				await post(SKILLS_MCP_API.skillDelete, {
					path,
					kind
				});
			}
			async scanSkills(dir) {
				return (await post(SKILLS_MCP_API.skillScan, { dir })).items;
			}
			async importSkills(items) {
				return (await post(SKILLS_MCP_API.skillImport, { items })).results;
			}
			async listMcp() {
				return (await get(SKILLS_MCP_API.mcp)).servers;
			}
			async saveMcp(server) {
				await post(SKILLS_MCP_API.mcpSave, { server });
			}
			async setMcpEnabled(name, enabled) {
				await post(SKILLS_MCP_API.mcpEnabled, {
					name,
					enabled
				});
			}
			async deleteMcp(name) {
				await post(SKILLS_MCP_API.mcpDelete, { name });
			}
			async testMcp(server) {
				return (await post(SKILLS_MCP_API.mcpTest, { server })).test;
			}
			async listCli(cwd) {
				const q = cwd ? "?cwd=" + encodeURIComponent(cwd) : "";
				return (await get(SKILLS_MCP_API.cli + q)).items;
			}
			async cliState(name, cwd) {
				const q = "?name=" + encodeURIComponent(name) + (cwd ? "&cwd=" + encodeURIComponent(cwd) : "");
				return (await get(SKILLS_MCP_API.cliState + q)).state;
			}
			async cliSubcommands(name, cwd) {
				const q = "?name=" + encodeURIComponent(name) + (cwd ? "&cwd=" + encodeURIComponent(cwd) : "");
				return (await get(SKILLS_MCP_API.cliSubcommands + q)).subcommands;
			}
			async saveCli(entry) {
				await post(SKILLS_MCP_API.cliSave, { entry });
			}
			async setCliEnabled(name, enabled) {
				await post(SKILLS_MCP_API.cliEnabled, {
					name,
					enabled
				});
			}
			async deleteCli(name) {
				await post(SKILLS_MCP_API.cliDelete, { name });
			}
			async probeCli(name, cwd) {
				const body = await post(SKILLS_MCP_API.cliProbe, {
					name,
					cwd
				});
				return {
					state: body.state,
					subcommands: body.subcommands
				};
			}
		};
		//#endregion
		//#region \0dsh-css:G:\Git_hub项目管理区\dsh-skills-mcp-cli-manager\src\client\settings-card.module.css.mjs
		const css = ".r_wUjG_card{background:#8080800d;border:1px solid #80808047;border-radius:8px;list-style:none;overflow:hidden}.r_wUjG_header{width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;display:flex}.r_wUjG_header:hover{background:#80808014}.r_wUjG_headText{flex-direction:column;gap:3px;min-width:0;display:flex}.r_wUjG_name{color:inherit;text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.r_wUjG_description{color:gray;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.35;overflow:hidden}.r_wUjG_chevron,.r_wUjG_chevronOpen{color:gray;flex:none;font-size:13px;transition:transform .12s}.r_wUjG_chevronOpen{transform:rotate(180deg)}.r_wUjG_body{border-top:1px solid #80808033;flex-direction:column;gap:16px;padding:14px;display:flex}.r_wUjG_notExposed,.r_wUjG_readOnly,.r_wUjG_note{color:gray;font-size:12px}.r_wUjG_error{color:#e5534b;font-size:12px}.r_wUjG_config{flex-direction:column;gap:10px;display:flex}.r_wUjG_field{flex-direction:column;gap:3px;display:flex}.r_wUjG_toggle{cursor:pointer;align-items:center;gap:8px;display:flex}.r_wUjG_toggle input{cursor:pointer}.r_wUjG_toggleLabel{font-size:13px;font-weight:600}.r_wUjG_hint{color:gray;margin:0;font-size:12px}.r_wUjG_sectionPage{flex-direction:column;gap:12px;display:flex}.r_wUjG_pageHeading{margin:0;font-size:16px;font-weight:600}.r_wUjG_pageIntro{color:gray;margin:0;font-size:13px}.r_wUjG_manager{flex-direction:column;gap:14px;display:flex}.r_wUjG_tabs{border-bottom:1px solid #80808040;gap:4px;display:flex}.r_wUjG_tab,.r_wUjG_tabActive{cursor:pointer;font:inherit;color:inherit;opacity:.7;background:0 0;border:none;border-bottom:2px solid #0000;padding:8px 14px}.r_wUjG_tabActive{opacity:1;border-bottom-color:currentColor;font-weight:600}.r_wUjG_disabledBanner{color:#e5534b;border:1px solid #e5534b66;border-radius:8px;margin:0;padding:8px 10px;font-size:12px}.r_wUjG_panel{flex-direction:column;gap:20px;display:flex}.r_wUjG_section{flex-direction:column;gap:10px;display:flex}.r_wUjG_h{margin:0;font-size:14px;font-weight:600}.r_wUjG_hGrow{flex:auto;margin:0;font-size:14px;font-weight:600}.r_wUjG_groupH{margin:10px 0 0;font-size:13px;font-weight:600}.r_wUjG_inline{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.r_wUjG_row{border:1px solid #80808033;border-radius:8px;align-items:center;gap:10px;padding:8px 10px;display:flex}.r_wUjG_main{flex:auto;min-width:0}.r_wUjG_desc{color:gray;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;font-size:12px;overflow:hidden}.r_wUjG_badge{white-space:nowrap;background:#80808026;border-radius:999px;padding:1px 8px;font-size:11px}.r_wUjG_status{color:gray;font-size:11px}.r_wUjG_switch{white-space:nowrap;align-items:center;gap:6px;font-size:12px;display:flex}.r_wUjG_switch input{cursor:pointer}.r_wUjG_btn{font:inherit;color:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #80808059;border-radius:6px;padding:4px 10px;font-size:12px}.r_wUjG_btn:hover{background:#8080801a}.r_wUjG_btn:disabled{opacity:.5;cursor:default}.r_wUjG_btnActive{background:#80808026}.r_wUjG_btnPrimary{border-color:currentColor;font-weight:600}.r_wUjG_btnDanger{color:#e5534b;border-color:#e5534b66}.r_wUjG_detail{background:#8080800a;border:1px solid #80808026;border-radius:8px;margin:4px 0 0;padding:10px}.r_wUjG_pre{white-space:pre-wrap;word-break:break-word;background:#80808014;border-radius:6px;max-height:320px;margin:8px 0 0;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;overflow:auto}.r_wUjG_scanList{flex-direction:column;gap:8px;display:flex}.r_wUjG_input,.r_wUjG_inputGrow,.r_wUjG_inputMono{font:inherit;color:inherit;box-sizing:border-box;background:0 0;border:1px solid #80808059;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.r_wUjG_inputGrow{flex:auto;width:auto;min-width:240px}.r_wUjG_inputMono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.r_wUjG_filterSelect{font:inherit;color:inherit;background:0 0;border:1px solid #80808059;border-radius:6px;flex:none;width:auto;padding:6px 8px;font-size:13px}textarea.r_wUjG_input{resize:vertical}.r_wUjG_form{flex-direction:column;gap:10px;display:flex}.r_wUjG_fieldLabel{flex-direction:column;gap:4px;display:flex}.r_wUjG_fieldName{color:gray;font-size:12px}";
		const tagId = "dsh-skills-mcp-cli-manager/settings-card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-skills-mcp-cli-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_card_module_css_default = {
			"badge": "r_wUjG_badge",
			"body": "r_wUjG_body",
			"btn": "r_wUjG_btn",
			"btnActive": "r_wUjG_btnActive",
			"btnDanger": "r_wUjG_btnDanger",
			"btnPrimary": "r_wUjG_btnPrimary",
			"card": "r_wUjG_card",
			"chevron": "r_wUjG_chevron",
			"chevronOpen": "r_wUjG_chevronOpen",
			"config": "r_wUjG_config",
			"desc": "r_wUjG_desc",
			"description": "r_wUjG_description",
			"detail": "r_wUjG_detail",
			"disabledBanner": "r_wUjG_disabledBanner",
			"error": "r_wUjG_error",
			"field": "r_wUjG_field",
			"fieldLabel": "r_wUjG_fieldLabel",
			"fieldName": "r_wUjG_fieldName",
			"filterSelect": "r_wUjG_filterSelect",
			"form": "r_wUjG_form",
			"groupH": "r_wUjG_groupH",
			"h": "r_wUjG_h",
			"hGrow": "r_wUjG_hGrow",
			"headText": "r_wUjG_headText",
			"header": "r_wUjG_header",
			"hint": "r_wUjG_hint",
			"inline": "r_wUjG_inline",
			"input": "r_wUjG_input",
			"inputGrow": "r_wUjG_inputGrow",
			"inputMono": "r_wUjG_inputMono",
			"main": "r_wUjG_main",
			"manager": "r_wUjG_manager",
			"name": "r_wUjG_name",
			"notExposed": "r_wUjG_notExposed",
			"note": "r_wUjG_note",
			"pageHeading": "r_wUjG_pageHeading",
			"pageIntro": "r_wUjG_pageIntro",
			"panel": "r_wUjG_panel",
			"pre": "r_wUjG_pre",
			"readOnly": "r_wUjG_readOnly",
			"row": "r_wUjG_row",
			"scanList": "r_wUjG_scanList",
			"section": "r_wUjG_section",
			"sectionPage": "r_wUjG_sectionPage",
			"status": "r_wUjG_status",
			"switch": "r_wUjG_switch",
			"tab": "r_wUjG_tab",
			"tabActive": "r_wUjG_tabActive",
			"tabs": "r_wUjG_tabs",
			"toggle": "r_wUjG_toggle",
			"toggleLabel": "r_wUjG_toggleLabel"
		};
		//#endregion
		//#region src/client/manager.tsx
		/**
		* The skills + MCP management UI rendered inside the settings card. Pure
		* React (no framework services): every data access goes through SkillsMcpApi,
		* which fetches the /api/dsh-skills-mcp routes. Inline Chinese copy mirrors
		* the original dynamic plugin; the card chrome above stays bilingual.
		*/
		/** Stateless fetch client (created once per module). */
		const api = new SkillsMcpApi();
		function sourceLabel(source) {
			if (source === "project-dsh") return ".dsh/skills";
			if (source === "project-agents") return ".agents/skills";
			if (source === "user-dsh") return "~/.dsh/skills";
			if (source === "user-agents") return "~/.agents/skills";
			return source;
		}
		function parseKv(text) {
			const obj = {};
			if (!text) return obj;
			text.split(/\n/).forEach((line) => {
				const t = line.trim();
				if (!t) return;
				const i = t.indexOf("=");
				if (i < 0) return;
				obj[t.slice(0, i).trim()] = t.slice(i + 1).trim();
			});
			return obj;
		}
		function kvText(obj) {
			return Object.keys(obj || {}).map((k) => k + "=" + (obj || {})[k]).join("\n");
		}
		const EMPTY_FORM = {
			name: "",
			transport: "stdio",
			command: "",
			args: "",
			env: "",
			cwd: "",
			url: "",
			headers: "",
			mode: "form",
			json: ""
		};
		/** Top-level manager with the Skills / MCP / CLI tabs. */
		function SkillsMcpManager(props) {
			const [tab, setTab] = (0, react.useState)("skills");
			const [refreshKey, setRefreshKey] = (0, react.useState)(0);
			const bump = () => {
				setRefreshKey((k) => k + 1);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.manager,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.tabs,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: tab === "skills" ? settings_card_module_css_default.tabActive : settings_card_module_css_default.tab,
								onClick: () => {
									setTab("skills");
								},
								children: "Skills 技能"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: tab === "mcp" ? settings_card_module_css_default.tabActive : settings_card_module_css_default.tab,
								onClick: () => {
									setTab("mcp");
								},
								children: "MCP 服务"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: tab === "cli" ? settings_card_module_css_default.tabActive : settings_card_module_css_default.tab,
								onClick: () => {
									setTab("cli");
								},
								children: "CLI 工具"
							})
						]
					}),
					props.enabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.disabledBanner,
						role: "status",
						children: "插件已禁用：路由与 MCP 连接、CLI 探测均已停止，重新启用后刷新即可恢复。"
					}),
					tab === "skills" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillsPanel, {
						cwd: props.cwd,
						refreshKey,
						onChanged: bump,
						pickDirectory: props.pickDirectory
					}) : tab === "mcp" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpPanel, {
						refreshKey,
						onChanged: bump
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CliPanel, {
						cwd: props.cwd,
						refreshKey,
						onChanged: bump
					})
				]
			});
		}
		function SkillsPanel(props) {
			const [list, setList] = (0, react.useState)({
				loading: true,
				items: [],
				error: ""
			});
			const [detailName, setDetailName] = (0, react.useState)(null);
			const [detail, setDetail] = (0, react.useState)(null);
			const [scan, setScan] = (0, react.useState)({
				dir: "",
				busy: false,
				items: [],
				selected: {},
				error: "",
				note: ""
			});
			const [busy, setBusy] = (0, react.useState)("");
			const [msg, setMsg] = (0, react.useState)("");
			const [confirmDel, setConfirmDel] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [enabledFilter, setEnabledFilter] = (0, react.useState)("all");
			const load = () => {
				setList({
					loading: true,
					items: [],
					error: ""
				});
				api.listSkills(props.cwd).then((items) => {
					setList({
						loading: false,
						items,
						error: ""
					});
				}).catch((e) => {
					setList({
						loading: false,
						items: [],
						error: String(e?.message || e)
					});
				});
			};
			(0, react.useEffect)(() => {
				load();
			}, [props.cwd, props.refreshKey]);
			const toggle = (skill) => {
				setBusy(skill.path);
				setMsg("");
				api.toggleSkill(skill.path, !skill.enabled).then(() => {
					setBusy("");
					load();
				}).catch((e) => {
					setBusy("");
					setMsg(String(e?.message || e));
				});
			};
			const remove = (skill) => {
				if (confirmDel !== skill.path) {
					setConfirmDel(skill.path);
					return;
				}
				setConfirmDel(null);
				setBusy(skill.path);
				setMsg("");
				api.deleteSkill(skill.path, skill.kind).then(() => {
					setBusy("");
					load();
				}).catch((e) => {
					setBusy("");
					setMsg(String(e?.message || e));
				});
			};
			const view = (skill) => {
				if (detailName === skill.path) {
					setDetailName(null);
					setDetail(null);
					return;
				}
				setDetailName(skill.path);
				setDetail(null);
				api.readSkill(skill.path).then((data) => {
					setDetail({
						path: skill.path,
						data
					});
				}).catch((e) => {
					setDetail({
						path: skill.path,
						data: { error: String(e?.message || e) }
					});
				});
			};
			const chooseDir = () => {
				props.pickDirectory().then((path) => {
					if (path) setScan((prev) => ({
						...prev,
						dir: path,
						error: ""
					}));
				}).catch((e) => {
					setScan((prev) => ({
						...prev,
						error: String(e?.message || e)
					}));
				});
			};
			const doScan = () => {
				const dir = scan.dir.trim();
				if (!dir) {
					setScan((prev) => ({
						...prev,
						error: "请输入目录路径"
					}));
					return;
				}
				setScan((prev) => ({
					...prev,
					busy: true,
					items: [],
					error: "",
					note: ""
				}));
				api.scanSkills(dir).then((items) => {
					setScan((prev) => ({
						...prev,
						busy: false,
						items,
						selected: {},
						note: items.length === 0 ? "未发现可导入的技能" : ""
					}));
				}).catch((e) => {
					setScan((prev) => ({
						...prev,
						busy: false,
						items: [],
						error: String(e?.message || e)
					}));
				});
			};
			const toggleSelect = (sourcePath) => {
				setScan((prev) => {
					const selected = { ...prev.selected };
					if (selected[sourcePath]) delete selected[sourcePath];
					else selected[sourcePath] = true;
					return {
						...prev,
						selected
					};
				});
			};
			const doImport = () => {
				const chosen = scan.items.filter((it) => scan.selected[it.sourcePath]);
				if (chosen.length === 0) {
					setScan((prev) => ({
						...prev,
						error: "请先勾选要导入的技能"
					}));
					return;
				}
				setScan((prev) => ({
					...prev,
					busy: true,
					error: ""
				}));
				api.importSkills(chosen.map((it) => ({
					sourcePath: it.sourcePath,
					kind: it.kind
				}))).then((results) => {
					const imported = results.filter((x) => x.ok).length;
					setScan((prev) => ({
						...prev,
						busy: false,
						selected: {},
						note: "已导入 " + imported + " 个技能"
					}));
					load();
				}).catch((e) => {
					setScan((prev) => ({
						...prev,
						busy: false,
						error: String(e?.message || e)
					}));
				});
			};
			const q = query.trim().toLowerCase();
			const filtered = list.items.filter((it) => {
				if (q !== "" && !it.name.toLowerCase().includes(q)) return false;
				if (enabledFilter === "enabled" && !it.enabled) return false;
				if (enabledFilter === "disabled" && it.enabled) return false;
				return true;
			});
			const byLevel = {};
			filtered.forEach((it) => {
				(byLevel[it.level] = byLevel[it.level] || []).push(it);
			});
			const rows = [];
			[["project", "项目级"], ["user", "用户级"]].forEach(([level, label]) => {
				const gs = byLevel[level] || [];
				if (gs.length === 0) return;
				rows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.groupH,
					children: [
						label,
						" (",
						gs.length,
						")"
					]
				}, "g-" + level));
				gs.forEach((skill) => {
					const isBusy = busy === skill.path;
					rows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_card_module_css_default.main,
								style: { cursor: "pointer" },
								onClick: () => {
									view(skill);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_card_module_css_default.name,
									children: [skill.name, skill.enabled ? "" : " （已禁用）"]
								}), skill.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: settings_card_module_css_default.desc,
									children: skill.description
								}) : null]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: sourceLabel(skill.source)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_card_module_css_default.switch,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: skill.enabled,
									disabled: isBusy,
									onChange: () => {
										toggle(skill);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: skill.enabled ? "启用" : "禁用" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.btn,
								onClick: () => {
									view(skill);
								},
								children: detailName === skill.path ? "收起" : "详情"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.btnDanger,
								disabled: isBusy,
								onClick: () => {
									remove(skill);
								},
								children: confirmDel === skill.path ? "确认删除?" : "删除"
							})
						]
					}, skill.path));
					if (detailName === skill.path) {
						const entry = detail;
						const d = entry && entry.path === skill.path ? entry.data : null;
						rows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.detail,
							children: d === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "加载中…" }) : d && d.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: d.error }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: settings_card_module_css_default.name,
									children: d.description || skill.description
								}),
								d.whenToUse ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_card_module_css_default.desc,
									children: ["When to use: ", d.whenToUse]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									className: settings_card_module_css_default.pre,
									children: d.content || ""
								})
							] })
						}, skill.path + "-detail"));
					}
				});
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.h,
							children: "导入技能"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: settings_card_module_css_default.inputGrow,
									placeholder: "目录路径（含 SKILL.md 的技能目录或平铺 .md）",
									value: scan.dir,
									onChange: (e) => {
										setScan((prev) => ({
											...prev,
											dir: e.target.value
										}));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btn,
									onClick: chooseDir,
									children: "选择文件夹"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btn,
									disabled: scan.busy,
									onClick: doScan,
									children: scan.busy ? "扫描中…" : "扫描目录"
								})
							]
						}),
						scan.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: scan.error
						}) : null,
						scan.items.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.scanList,
							children: [scan.items.map((it) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_card_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: !!scan.selected[it.sourcePath],
									onChange: () => {
										toggleSelect(it.sourcePath);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_card_module_css_default.main,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_card_module_css_default.name,
										children: [it.name, it.kind === "bundle" ? " (目录)" : " (文件)"]
									}), it.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: settings_card_module_css_default.desc,
										children: it.description
									}) : null]
								})]
							}, it.sourcePath)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: settings_card_module_css_default.btn,
								disabled: scan.busy,
								onClick: doImport,
								children: [
									"导入选中 (",
									Object.keys(scan.selected).length,
									")"
								]
							})]
						}) : null,
						scan.note ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.note,
							children: scan.note
						}) : null
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_card_module_css_default.hGrow,
								children: "技能列表"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.btn,
								onClick: load,
								children: "刷新"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: settings_card_module_css_default.inputGrow,
								placeholder: "搜索技能名称…",
								value: query,
								onChange: (e) => {
									setQuery(e.target.value);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: settings_card_module_css_default.filterSelect,
								value: enabledFilter,
								onChange: (e) => {
									setEnabledFilter(e.target.value);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "all",
										children: "全部"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "enabled",
										children: "已启用"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "disabled",
										children: "未启用"
									})
								]
							})]
						}),
						msg ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: msg
						}) : null,
						list.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: list.error
						}) : null,
						list.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "加载中…" }) : filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: list.items.length === 0 ? "没有发现技能" : "没有匹配的技能" }) : rows
					]
				})]
			});
		}
		function McpPanel(props) {
			const [list, setList] = (0, react.useState)({
				loading: true,
				servers: [],
				error: ""
			});
			const [form, setForm] = (0, react.useState)(EMPTY_FORM);
			const [busy, setBusy] = (0, react.useState)("");
			const [msg, setMsg] = (0, react.useState)("");
			const [confirmDel, setConfirmDel] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const load = () => {
				setList({
					loading: true,
					servers: [],
					error: ""
				});
				api.listMcp().then((servers) => {
					setList({
						loading: false,
						servers,
						error: ""
					});
				}).catch((e) => {
					setList({
						loading: false,
						servers: [],
						error: String(e?.message || e)
					});
				});
			};
			(0, react.useEffect)(() => {
				load();
			}, [props.refreshKey]);
			const patch = (p) => {
				setForm((prev) => ({
					...prev,
					...p
				}));
			};
			const buildServer = () => {
				if (form.mode === "json") try {
					return JSON.parse(form.json);
				} catch (e) {
					setMsg("JSON 解析失败：" + String(e?.message || e));
					return null;
				}
				const server = {
					name: form.name.trim(),
					transport: form.transport,
					enabled: true
				};
				if (form.transport === "stdio") {
					server.command = form.command.trim();
					server.args = form.args.split(/\n/).map((l) => l.trim()).filter((l) => l !== "");
					server.cwd = form.cwd.trim();
					server.env = parseKv(form.env);
				} else {
					server.url = form.url.trim();
					server.headers = parseKv(form.headers);
				}
				return server;
			};
			const save = (server) => {
				if (!server) return;
				setBusy("save");
				setMsg("");
				api.saveMcp(server).then(() => {
					setBusy("");
					setMsg("已保存 " + server.name);
					setForm(EMPTY_FORM);
					load();
				}).catch((e) => {
					setBusy("");
					setMsg(String(e?.message || e));
				});
			};
			const toggle = (s) => {
				setMsg("");
				api.setMcpEnabled(s.name, !s.enabled).then(() => {
					load();
				}).catch((e) => {
					setMsg(String(e?.message || e));
				});
			};
			const remove = (s) => {
				if (confirmDel !== s.name) {
					setConfirmDel(s.name);
					return;
				}
				setConfirmDel(null);
				setMsg("");
				api.deleteMcp(s.name).then(() => {
					load();
				}).catch((e) => {
					setMsg(String(e?.message || e));
				});
			};
			const edit = (s) => {
				setForm({
					name: s.name,
					transport: s.transport || "stdio",
					command: s.command || "",
					args: (s.args || []).join("\n"),
					env: kvText(s.env),
					cwd: s.cwd || "",
					url: s.url || "",
					headers: kvText(s.headers),
					mode: "form",
					json: JSON.stringify(s, null, 2)
				});
				setConfirmDel(null);
			};
			const test = (server) => {
				if (!server) return;
				setBusy("test");
				setMsg("");
				api.testMcp(server).then((r) => {
					setBusy("");
					setMsg(r.ok ? "连接成功" : "连接失败：" + (r.error || "unknown error"));
				}).catch((e) => {
					setBusy("");
					setMsg(String(e?.message || e));
				});
			};
			const statusLabel = {
				connecting: "连接中",
				running: "运行中",
				failed: "失败",
				stopped: "已停止"
			};
			const mq = query.trim().toLowerCase();
			const filteredServers = list.servers.filter((s) => mq === "" || s.name.toLowerCase().includes(mq));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_card_module_css_default.hGrow,
								children: "MCP 服务器"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: settings_card_module_css_default.inputGrow,
								placeholder: "搜索服务器名称…",
								value: query,
								onChange: (e) => {
									setQuery(e.target.value);
								}
							})]
						}),
						msg ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: msg
						}) : null,
						list.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: list.error
						}) : null,
						list.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "加载中…" }) : filteredServers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: list.servers.length === 0 ? "尚未配置任何 MCP 服务器" : "没有匹配的服务器" }) : filteredServers.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.row,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_card_module_css_default.main,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: settings_card_module_css_default.name,
											children: [
												s.name,
												s.enabled ? "" : " （已禁用）",
												" ",
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_card_module_css_default.status,
													children: statusLabel[s.status] || s.status
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: settings_card_module_css_default.desc,
											children: [s.transport, s.transport === "stdio" ? " · " + (s.command || "") : " · " + (s.url || "")]
										}),
										s.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_card_module_css_default.error,
											children: s.error
										}) : null
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_card_module_css_default.switch,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: s.enabled,
										onChange: () => {
											toggle(s);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: s.enabled ? "启用" : "禁用" })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btn,
									onClick: () => {
										edit(s);
									},
									children: "编辑"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btnDanger,
									onClick: () => {
										remove(s);
									},
									children: confirmDel === s.name ? "确认删除?" : "删除"
								})
							]
						}, s.name))
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.h,
							children: "新建 / 编辑服务器"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: form.mode === "form" ? settings_card_module_css_default.btnActive : settings_card_module_css_default.btn,
								onClick: () => {
									patch({ mode: "form" });
								},
								children: "表单"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: form.mode === "json" ? settings_card_module_css_default.btnActive : settings_card_module_css_default.btn,
								onClick: () => {
									patch({ mode: "json" });
								},
								children: "JSON"
							})]
						}),
						form.mode === "form" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.form,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "名称 name",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_card_module_css_default.input,
										value: form.name,
										placeholder: "例如 github",
										onChange: (e) => {
											patch({ name: e.target.value });
										}
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "传输 transport",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_card_module_css_default.input,
										value: form.transport,
										onChange: (e) => {
											patch({ transport: e.target.value });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "stdio",
											children: "stdio"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "streamable-http",
											children: "streamable-http"
										})]
									})
								}),
								form.transport === "stdio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "命令 command",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_card_module_css_default.input,
											value: form.command,
											placeholder: "npx",
											onChange: (e) => {
												patch({ command: e.target.value });
											}
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "参数 args（每行一个）",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: settings_card_module_css_default.input,
											rows: 2,
											value: form.args,
											placeholder: "-y\n@modelcontextprotocol/server-github",
											onChange: (e) => {
												patch({ args: e.target.value });
											}
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "环境变量 env（KEY=VALUE 每行一个）",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: settings_card_module_css_default.input,
											rows: 2,
											value: form.env,
											onChange: (e) => {
												patch({ env: e.target.value });
											}
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "工作目录 cwd",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_card_module_css_default.input,
											value: form.cwd,
											onChange: (e) => {
												patch({ cwd: e.target.value });
											}
										})
									})
								] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "URL",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_card_module_css_default.input,
										value: form.url,
										placeholder: "http://localhost:3000/mcp",
										onChange: (e) => {
											patch({ url: e.target.value });
										}
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "请求头 headers（KEY=VALUE 每行一个）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: settings_card_module_css_default.input,
										rows: 2,
										value: form.headers,
										onChange: (e) => {
											patch({ headers: e.target.value });
										}
									})
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_card_module_css_default.inline,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_card_module_css_default.btnPrimary,
										disabled: busy === "save",
										onClick: () => {
											save(buildServer());
										},
										children: busy === "save" ? "保存中…" : "保存"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_card_module_css_default.btn,
										disabled: busy === "test",
										onClick: () => {
											test(buildServer());
										},
										children: busy === "test" ? "测试中…" : "测试连接"
									})]
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.form,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: settings_card_module_css_default.inputMono,
								rows: 12,
								value: form.json,
								placeholder: "{\n  \"name\": \"github\",\n  \"transport\": \"stdio\",\n  \"command\": \"npx\",\n  \"args\": [\"-y\", \"@modelcontextprotocol/server-github\"],\n  \"enabled\": true\n}",
								onChange: (e) => {
									patch({ json: e.target.value });
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.btnPrimary,
								disabled: busy === "save",
								onClick: () => {
									save(buildServer());
								},
								children: busy === "save" ? "保存中…" : "保存"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.desc,
							children: "配置持久化到 ~/.dsh/mcp.json；启用的服务器经 @deepseek-ai/dsh-mcp-client 真实连接并把工具注册为 mcp__<server>__<tool>。"
						})
					]
				})]
			});
		}
		function CliPanel(props) {
			const [list, setList] = (0, react.useState)({
				loading: true,
				items: [],
				error: ""
			});
			const [form, setForm] = (0, react.useState)({
				name: "",
				command: ""
			});
			const [detail, setDetail] = (0, react.useState)(null);
			const [msg, setMsg] = (0, react.useState)("");
			const [confirmDel, setConfirmDel] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const load = () => {
				setList({
					loading: true,
					items: [],
					error: ""
				});
				api.listCli(props.cwd).then((items) => {
					setList({
						loading: false,
						items,
						error: ""
					});
				}).catch((e) => {
					setList({
						loading: false,
						items: [],
						error: String(e?.message || e)
					});
				});
			};
			(0, react.useEffect)(() => {
				load();
			}, [props.cwd, props.refreshKey]);
			const probe = (name) => {
				setDetail((prev) => ({
					name,
					busy: true,
					error: "",
					...prev && prev.name === name ? prev : {}
				}));
				api.probeCli(name, props.cwd).then((r) => {
					setDetail({
						name,
						state: r.state,
						subcommands: r.subcommands,
						busy: false,
						error: ""
					});
				}).catch((e) => {
					setDetail({
						name,
						busy: false,
						error: String(e?.message || e)
					});
				});
			};
			const view = (name) => {
				if (detail && detail.name === name) {
					setDetail(null);
					return;
				}
				probe(name);
			};
			const toggle = (entry) => {
				setMsg("");
				api.setCliEnabled(entry.name, !entry.enabled).then(() => {
					load();
				}).catch((e) => {
					setMsg(String(e?.message || e));
				});
			};
			const remove = (entry) => {
				if (entry.source !== "registry") return;
				if (confirmDel !== entry.name) {
					setConfirmDel(entry.name);
					return;
				}
				setConfirmDel(null);
				setMsg("");
				api.deleteCli(entry.name).then(() => {
					load();
					setDetail(null);
				}).catch((e) => {
					setMsg(String(e?.message || e));
				});
			};
			const addEntry = () => {
				const name = form.name.trim();
				const command = form.command.trim() || name;
				if (!name) {
					setMsg("请输入 CLI 命令名");
					return;
				}
				setMsg("");
				api.saveCli({
					name,
					command,
					enabled: true
				}).then(() => {
					setForm({
						name: "",
						command: ""
					});
					load();
				}).catch((e) => {
					setMsg(String(e?.message || e));
				});
			};
			const mq = query.trim().toLowerCase();
			const filtered = list.items.filter((it) => mq === "" || it.name.toLowerCase().includes(mq) || (it.skill || "").toLowerCase().includes(mq));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: settings_card_module_css_default.hGrow,
									children: "本地 CLI 工具"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: settings_card_module_css_default.inputGrow,
									placeholder: "搜索 CLI 名称…",
									value: query,
									onChange: (e) => {
										setQuery(e.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btn,
									onClick: load,
									children: "刷新"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.desc,
							style: { marginTop: 0 },
							children: "自动发现 skill 内嵌的 CLI（scripts/run-cli）与系统 CLI（gh/git 等）。来源：skill 上的脚本进行状态探测；系统 CLI 记录在 ~/.dsh/cli.json。"
						}),
						msg ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: msg
						}) : null,
						list.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.error,
							children: list.error
						}) : null,
						list.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "加载中…" }) : filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: list.items.length === 0 ? "未发现 CLI 工具" : "没有匹配的 CLI" }) : filtered.map((entry) => {
							const isDetail = detail !== null && detail.name === entry.name;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_card_module_css_default.row,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_card_module_css_default.main,
										style: { cursor: "pointer" },
										onClick: () => {
											view(entry.name);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: settings_card_module_css_default.name,
											children: [
												entry.name,
												entry.enabled ? "" : " （已禁用）",
												" ",
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_card_module_css_default.status,
													children: entry.exists ? "已安装" : "未找到"
												})
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: settings_card_module_css_default.desc,
											children: [
												entry.source === "skill" ? "Skill: " + (entry.skill || "") : "系统 CLI",
												" · ",
												entry.path || entry.command
											]
										})]
									}),
									entry.source === "registry" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_card_module_css_default.switch,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: entry.enabled,
											onChange: () => {
												toggle(entry);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.enabled ? "启用" : "禁用" })]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: settings_card_module_css_default.badge,
										children: "Skill"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_card_module_css_default.btn,
										onClick: () => {
											view(entry.name);
										},
										children: isDetail ? "收起" : "探测"
									}),
									entry.source === "registry" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_card_module_css_default.btnDanger,
										onClick: () => {
											remove(entry);
										},
										children: confirmDel === entry.name ? "确认删除?" : "删除"
									}) : null
								]
							}), isDetail ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_card_module_css_default.detail,
								children: detail.busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: "探测中…" }) : detail.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: detail.error }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "存在",
										value: detail.state?.exists === false ? "未找到" : "已安装"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "路径",
										value: detail.state?.path
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "版本",
										value: detail.state?.version
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "需要更新",
										value: detail.state?.needUpdate === true ? "是（建议 update）" : detail.state?.needUpdate === false ? "否" : void 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "API Key",
										value: detail.state?.apiKey?.status ? detail.state.apiKey.status === "configured" ? "已配置" : detail.state.apiKey.status : void 0
									}),
									detail.state?.apiKey?.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateRow, {
										label: "Key 错误",
										value: detail.state.apiKey.error
									}) : null,
									detail.subcommands && detail.subcommands.subcommands.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: settings_card_module_css_default.inline,
										style: {
											flexWrap: "wrap",
											gap: 6
										},
										children: detail.subcommands.subcommands.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: settings_card_module_css_default.badge,
											children: c
										}, c))
									}) : null
								] })
							}) : null] }, entry.name);
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.h,
							children: "登记系统 CLI"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.inline,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: settings_card_module_css_default.inputGrow,
									placeholder: "CLI 命令名，例如 gh",
									value: form.name,
									onChange: (e) => {
										setForm((prev) => ({
											...prev,
											name: e.target.value
										}));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: settings_card_module_css_default.inputGrow,
									placeholder: "调用名（可留空，默认同命令名）",
									value: form.command,
									onChange: (e) => {
										setForm((prev) => ({
											...prev,
											command: e.target.value
										}));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.btnPrimary,
									onClick: addEntry,
									children: "添加"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_card_module_css_default.desc,
							children: "登记后插件会探测其存在、版本与子命令；skill 内嵌 CLI 自动出现，无需手动登记。"
						})
					]
				})]
			});
		}
		function StateRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.inline,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.desc,
					style: { minWidth: 92 },
					children: [props.label, ":"]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_card_module_css_default.desc,
					children: props.value || "—"
				})]
			});
		}
		function Field(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: settings_card_module_css_default.fieldLabel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: settings_card_module_css_default.fieldName,
					children: props.label
				}), props.children]
			});
		}
		//#endregion
		//#region src/client/SettingsCard.tsx
		/**
		* Render the settings section content.
		* @param props - locale copy, the shell's close action, and the picker helper.
		* @returns the section page.
		*/
		function SkillsMcpSection(props) {
			const { t } = props;
			const cwd = props.useWorkspaces((s) => {
				const items = s && s.items || [];
				const ws = items.find((w) => w.workspaceId === s.recentWorkspaceId) || items[0];
				return ws ? ws.path : "";
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.sectionPage,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: settings_card_module_css_default.pageHeading,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.pageIntro,
						children: t("description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillsMcpManager, {
						cwd,
						enabled: true,
						pickDirectory: props.pickDirectory
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Locale namespace this plugin owns. */
		const NS = "skills-mcp-manager";
		/** Required services (fiber inject waiting — the runtime must be up first). */
		const inject = [
			"slots",
			"workspaces",
			"locale"
		];
		/**
		* Mount the settings page.
		* @param ctx - client root context (slots, workspaces, locale).
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "skills-mcp-manager: dictionaries");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skills-mcp",
				order: 20,
				label: () => ctx.locale.bind(NS)("title"),
				locale: NS,
				inject: () => ({ pickDirectory: () => ctx.workspaces.pickDirectory() })
			}, SkillsMcpSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map