<div align="center">
  🌏 <a href="./README.zh.md">中文</a> · <b>English</b>
</div>

<div align="center">
  <b style="font-size: 1.15em;">A DeepSeek Harness (DSH) web plugin: a Skill + MCP + CLI manager in one settings page.</b><br /><br />
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <a href="https://github.com/zebbkira/dsh-skills-mcp-manager"><img alt="Upstream" src="https://img.shields.io/badge/upstream-YpipaQ%2Fmy--dsh--plugin-4d6bfe" /></a>
  <a href="https://github.com/zebbkira/dsh-skills-mcp-manager/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/zebbkira/dsh-skills-mcp-manager" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="DSH" src="https://img.shields.io/badge/DSH-0.1.0--rc%2B-4d6bfe" /></a>
</div>

# dsh-skills-mcp-cli-manager

> **Skills Center** — a self-contained DSH web plugin that adds a first-class **settings page** for the
> three agent tool families: **Skills**, **MCP servers**, and **local CLI tools**.
>
> Mounted purely as a profile bundle patch + package — **no DeepSeek Harness source changes**. This
> copy is a **derived, private fork** (adds the CLI layer + the "Skills Center" naming) of the
> upstream plugin; see [CREDITS.md](./CREDITS.md).

## ✨ What it is

One settings page (「Web UI 插件 → 技能中心」) that manages the agent's three tool families:

| Tab | Manages | Backing |
|---|---|---|
| **Skills 技能** | browse / enable / disable / delete / import skills (project + user roots) | `SKILL.md` frontmatter rewrite |
| **MCP 服务** | create / edit / test / enable / disable / delete MCP servers | real `@deepseek-ai/dsh-mcp-client` connections (`mcp__<server>__<tool>`) |
| **CLI 工具** | discover / probe local CLI tools; register system CLIs | skill-embedded `scripts/run-cli` + `~/.dsh/cli.json` |

## 💡 Features

- **Skills** — group by project/user level & source (`.dsh/skills`, `.agents/skills`, `~/.dsh/skills`, `~/.agents/skills`); enable/disable via frontmatter (`disable-model-invocation`/`user-invocable`); two-step physical delete; detail (description / whenToUse / body); import from an arbitrary directory (native picker or typed path) into `~/.dsh/skills`.
- **MCP** — form or JSON editor; **test connection** (one-shot real probe); enable/disable actually connects/disconnects and registers `mcp__<server>__<tool>` tools; live status (`connecting` / `running` / `failed` / `stopped`); persisted to `~/.dsh/mcp.json`.
- **CLI** — auto-discovers the CLI a skill wraps (its `scripts/run-cli.*` / `scripts/cli-state.*`, the tencent-news pattern); probes whether it is installed / its version / needs-update / API-key state (parsing `cli-state` JSON) and lists its subcommands (from `help`); a `~/.dsh/cli.json` registry for system CLIs (`gh`, `git`, `tencent-news-cli` …) with enable/delete.

## 🚀 Install

> **Install as a normal package — do NOT link it via a junction.** A junction makes dependencies
> fail to resolve upward (e.g. `schemastery` / `react`) and desyncs the package name from
> `cordis.patch.yml`; both break DSH startup.

```sh
# From npm (when published): https://www.npmjs.com/package/dsh-skills-mcp-cli-manager
dsh plugin --profile web add dsh-skills-mcp-cli-manager
# or: npm install dsh-skills-mcp-cli-manager

# From source (this repo / after cloning)
dsh plugin --profile web add <absolute path to this folder>

# Or the built tarball
dsh plugin --profile web add <path>/dsh-skills-mcp-cli-manager-<version>.tgz

# Or the convenience scripts
bash scripts/install.sh                                        # macOS / Linux / Git Bash
powershell -ExecutionPolicy Bypass -File scripts/install.ps1   # Windows
```

After installing, **restart DSH and hard-refresh the browser** (Cmd/Ctrl+Shift+R). Then open
「设置 → Web UI 插件 → **技能中心**」 (Settings → Web UI Plugins → Skills Center).

## ⚙️ Configuration

```yaml
# This plugin's own settings namespace (dsh settings)
skills-mcp-manager:
  enabled: true        # master switch (routes, MCP connections, CLI probes)
  announceToAgent: true # announce the plugin to every agent's system prompt
```

Runtime state:

- MCP servers: `~/.dsh/mcp.json` (credentials/headers stored **plaintext** — keep the file at `0600`).
- CLI registry: `~/.dsh/cli.json`.

## 🗂️ Repository structure

```
dsh-skills-mcp-cli-manager/
├── src/                # TypeScript source (host + client halves)
│   ├── index.ts        # host entry (plug-in load, settings namespace, agent announcement)
│   ├── skills.ts       # skills filesystem engine
│   ├── mcp.ts          # MCP config store + real connection manager
│   ├── cli.ts          # CLI discovery / probe / registry + cli-state parsing
│   ├── routes.ts       # /api/dsh-skills-mcp route family
│   ├── protocol.ts     # shared types + API paths
│   └── client/         # browser half (entry, SettingsCard, manager, api, locales, css)
├── lib/                # built plugin (host: index.js; client: client.js; types/*)
├── cordis.patch.yml    # DSH bundle patch (package name must match package.json)
├── dsh.plugin.json     # DSH plugin manifest (id / version / main / client.main)
├── package.json        # npm package (dsh.bundle.patch + dsh.client)
├── LICENSE / CREDITS.md# MIT + upstream credits
├── README.md / README.zh.md
├── docs/development.md # dev notes (build, upstream re-sync)
└── scripts/install.*   # one-click install into a DSH profile
```

## 🛠️ Development

See [`docs/development.md`](./docs/development.md) for the two-half build (`tsdown`, reconstructs
`lib/index.js` + `lib/client.js`), type-checking, and re-syncing upstream fixes.

## 📄 License & Credits

- **License**: [MIT](./LICENSE). The upstream plugin remains © its original author — see [CREDITS.md](./CREDITS.md).
- The **CLI layer** and the **"Skills Center"** naming are additions by this fork's author.

---

*中文说明见 [`README.zh.md`](./README.zh.md)。*
