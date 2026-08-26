# Development notes

This repo ships both a TypeScript source tree (`src/`) and the built plugin (`lib/`). To change
behavior you edit `src/*`, rebuild, and commit the regenerated `lib/`.

## Architecture

Two halves, both built from `src/` into `lib/` by a single `tsdown` run:

| Half | Entry | Output | Build target |
|---|---|---|---|
| Host (node) | `src/index.ts` | `lib/index.js` | ESM, platform `node` |
| Client (browser) | `src/client/index.ts` | `lib/client.js` | CJS wrapped in `window.__ModuleLoader__.load(...)`, platform `browser` |

- **Host half** (`index.ts`, `skills.ts`, `mcp.ts`, `cli.ts`, `routes.ts`, `protocol.ts`) uses `node:fs`,
  `node:os`, `node:path`, `node:child_process`, `@deepseek-ai/dsh-settings`, `schemastery`,
  `@deepseek-ai/dsh-mcp-client`. It registers the `/api/dsh-skills-mcp/*` route family on the
  **loopback-only** `webServer` and announces itself to every agent via `systemPrompt.section`.
- **Client half** (`client/index.ts`, `SettingsCard.tsx`, `manager.tsx`, `api.ts`, `locales.ts`)
  uses only `react` as a runtime external; the `@deepseek-ai/dsh-client-*` imports are **type-only**
  (erased at build). It registers a first-class `settings.section` page.
- `src/protocol.ts` holds the shared `SKILLS_MCP_API` path constants both halves import — a route
  rename is a single edit.

## Build

The upstream repo did not ship build config; this repo reconstructs it:

- `tsdown.config.ts` — externalizes host value deps + node builtins; externalizes `react`/`react-dom`
  for the client; inlines CSS Modules (`[hash]_[local]`, `data-plugin-css` style tags) via a local
  lightningcss plugin; adds the `__ModuleLoader__.load` banner/footer.
- `tsconfig.json` — type-check only.

```sh
pnpm install --ignore-scripts   # installs tsdown, typescript, @tsdown/css, react, etc.
pnpm exec tsc --noEmit          # type-check (expect 0 errors)
pnpm exec tsdown                # regenerate lib/index.js + lib/client.js
```

> The npm `build`/`bundle` scripts reference an upstream-absent `scripts/wrap-client.mjs`; the
> `tsdown` output already carries the loader wrapper, so run `pnpm exec tsdown` directly.

## Verification (no DSH restart needed)

Type-check + bundle syntax are enough to confirm the code is sound before installing:

```sh
pnpm exec tsc --noEmit
node --check lib/index.js
node --check lib/client.js
```

To sanity-check the CLI manager without a Host process, drive `src/cli.ts` with a stub
`SkillsManager` (Node ≥23.6 with `--experimental-transform-types`) and point it at a real skill
bundle that ships `scripts/run-cli.*`.

## Install / activate

A Host route + client bundle change only takes effect after **restarting the DSH profile process**
(the client bundle is served at page load, not hot-reloaded). Install as a **normal package**
(`dsh plugin --profile <name> add <path|tgz|name>`), never via junction.

## Re-syncing upstream fixes (skills / MCP)

This plugin is self-contained. To pick up an upstream skills/MCP fix, copy the updated upstream
`src/skills.ts`, `src/mcp.ts`, `src/routes.ts`, `src/client/*` into this tree (leave `src/cli.ts`
and the "Skills Center" labeling untouched), then rebuild.
