# @zebbkira/dsh-skills-mcp-manager — AGENTS.md

> Guidance for AI agents / contributors working in this repository.

## What this is

A **self-contained** DeepSeek Harness (DSH) web plugin that adds a first-class **settings page**
(「Web UI 插件 → 技能中心」) managing the agent's three tool families:

| Tab | What it manages | Backing |
|---|---|---|
| Skills 技能 | browse / enable / disable / delete / import skills (project + user roots) | `SKILL.md` frontmatter rewrite |
| MCP 服务 | create / edit / test / enable / disable / delete MCP servers | real `@deepseek-ai/dsh-mcp-client` connections (`mcp__<server>__<tool>`) |
| CLI 工具 | discover / probe local CLI tools; register system CLIs | skill-embedded `scripts/run-cli` + `~/.dsh/cli.json` |

It mounts purely as a profile bundle patch + package. **It does NOT modify DeepSeek Harness (DSH)
source, and it does NOT modify the upstream plugin package** — the CLI layer and the "Skills Center"
naming are additions by this fork's author (see `CREDITS.md`).

## Repository layout

```
dsh-skills-mcp-manager/
├── src/                # TypeScript source (host + client halves)
│   ├── index.ts        # host entry (plug-in load, settings namespace, agent announcement)
│   ├── skills.ts       # skills filesystem engine
│   ├── mcp.ts          # MCP config store + real connection manager
│   ├── cli.ts          # CLI discovery / probe / registry + cli-state parsing
│   ├── routes.ts       # /api/dsh-skills-mcp route family
│   ├── protocol.ts     # shared types + API paths
│   ├── tsdown.config.ts / tsconfig.json  # reconstructed two-half build + type-check
│   └── client/         # browser half (entry, SettingsCard, manager, api, locales, css)
├── lib/                # built plugin (host: index.js; client: client.js; types/*)
├── cordis.patch.yml    # DSH bundle patch
├── dsh.plugin.json     # DSH plugin manifest (id / version / main / client.main)
├── package.json        # npm package (dsh.bundle.patch + dsh.client)
├── LICENSE / CREDITS.md# MIT + upstream credits
├── README.md / README.zh.md
├── docs/development.md # dev notes (two-half build, upstream re-sync)
└── scripts/install.*   # one-click install into a DSH profile
```

## Hard rules

- **Do NOT modify DeepSeek Harness (DSH) source.** Never write to `~/.dsh/source/current` or commit harness changes. The plugin is always a package the profile references.
- **Install as a normal package, not a junction.** A junction breaks Node dependency resolution (the plugin's deps like `schemastery`/`react` fail to resolve upward) and desyncs the package name from `cordis.patch.yml`. Install via `dsh plugin --profile <name> add <path>` or `file:<tarball>`.
- **The package name must match `cordis.patch.yml`'s `name`** (`@zebbkira/dsh-skills-mcp-manager`). Do not rename one without the other, or DSH boot fails with `Cannot find package ...`.
- `lib/` is the shipped artifact. It is **built from `src/`** (this repo has a source tree). To change behavior, edit `src/*`, then rebuild (`pnpm exec tsdown`) and commit the regenerated `lib/`.
- The **host half** registers the `/api/dsh-skills-mcp/*` route family on the loopback-only `webServer`; the **client half** registers the settings page. Keep the shared `SKILLS_MCP_API` path constants in `src/protocol.ts` as the single source of truth for both halves.

## Typical dev flow

- **Install from npm (published)**: `dsh plugin --profile web add @zebbkira/dsh-skills-mcp-manager` (or `npm install @zebbkira/dsh-skills-mcp-manager`), then restart DSH + hard-refresh the browser.
- **Install from source**: `dsh plugin --profile web add <abs path>` (local dir / tarball), then restart DSH + hard-refresh.
- **Build**: 
  ```sh
  pnpm install --ignore-scripts
  pnpm exec tsc --noEmit    # type-check (0 errors expected)
  pnpm exec tsdown          # regenerate lib/index.js + lib/client.js
  ```
- **Tarball**: `pnpm pack` (or `npm pack`) → `dsh-skills-mcp-manager-<version>.tgz`.

## Where things live at runtime

- Skill roots scanned: `<project>/.dsh/skills`, `<project>/.agents/skills`, `~/.dsh/skills`, `~/.agents/skills`.
- MCP servers: `~/.dsh/mcp.json` (credentials/headers **plaintext** — keep at `0600`).
- CLI registry: `~/.dsh/cli.json`.

## Present (this repo has a source tree)

Because this repo ships `src/` **and** the built `lib/`, it legitimately carries `tsconfig.json`,
`tsdown.config.ts`, and a `typecheck` script. Add tests / CI only when a test suite is introduced.
