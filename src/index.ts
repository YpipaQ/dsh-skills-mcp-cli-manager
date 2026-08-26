/**
 * dsh-skills-mcp-manager — host half. Mounts the skills filesystem engine,
 * the MCP connection manager (real @deepseek-ai/dsh-mcp-client instances per
 * enabled server), the /api/dsh-skills-mcp route family, and a system-prompt
 * announcement. The browser half (./client) renders the settings card.
 * Everything rides official NPM SDK packages — no dsh source changes.
 * @module
 */

import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from 'schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { CliManager } from './cli.ts'
import { McpManager } from './mcp.ts'
import { makeRoutes } from './routes.ts'
import { SkillsManager } from './skills.ts'

/** Stable cordis plugin name. */
export const name = 'skills-mcp-manager'

/** Services required before the surfaces can mount. `settings` is
 * deliberately absent: installSettingsSection registers it on an inner scoped
 * fiber, so a deployment without the settings surface still gets routes + MCP. */
export const inject = ['webServer', 'tools', 'systemPrompt']

/**
 * Settings namespace this plugin's config lives under. Spelled here rather
 * than imported: the browser half spells the same value and must not depend
 * on a Host package.
 */
export const SKILLS_MCP_NAMESPACE = settingsNamespace('skills-mcp-manager')

/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
  /** Master switch (routes, MCP connections, prompt section). */
  enabled?: boolean
  /** Announce the plugin to every agent's system prompt. */
  announceToAgent?: boolean
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  announceToAgent: z.boolean().default(true),
})

const DEFAULT_ENABLED = true
const DEFAULT_ANNOUNCE = true

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 160

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const SKILLS_MCP_GUIDANCE = '本机已安装 dsh-skills-mcp-manager 插件（技能中心：技能 / MCP / CLI 管理器）：设置页「Web UI 插件 → 技能中心」。能力：浏览/启用/禁用/删除/导入技能（项目级 .dsh/skills、.agents/skills 与用户级 ~/.dsh/skills、~/.agents/skills）；管理 MCP 服务器（stdio 与 streamable-http）；以及本地 CLI 工具清单与状态（发现 skill 内嵌的 CLI 包装脚本如 scripts/run-cli、以及系统 CLI 如 gh/git/tencent-news-cli，报告是否安装/版本/需更新/子命令/API-Key 状态）。MCP 是真实连接：启用的服务器经 @deepseek-ai/dsh-mcp-client 真正连接并把工具注册为 mcp__<server>__<tool>，启用/禁用会实际连接/断开。限制：MCP 服务器配置存 ~/.dsh/mcp.json（密码/env 明文、权限 0600 由用户自行保证）；CLI 注册表存 ~/.dsh/cli.json；技能启用/禁用通过改写 SKILL.md 前言实现；删除为物理删除，不可恢复。用户提到「技能管理 / 技能导入 / MCP 服务器 / MCP 连接 / CLI 工具 / CLI 状态」时即指本插件，请据此协作。'

/**
 * Mount the skills engine, MCP manager, routes, and announcement.
 * @param ctx - host plugin context carrying settings/webServer/tools/systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export function apply(ctx: Context, config?: Config): void {
  let current: () => Config = () => config ?? {}
  const resolve = (): Config => ({
    enabled: current().enabled ?? DEFAULT_ENABLED,
    announceToAgent: current().announceToAgent ?? DEFAULT_ANNOUNCE,
  })

  const skills = new SkillsManager()
  const mcp = new McpManager(ctx)
  const cli = new CliManager(skills)
  const { routes } = makeRoutes({ skills, mcp, cli })

  let disposeSection: (() => void) | undefined
  let disposeRoutes: (() => void) | undefined

  // Register (or drop) every surface to match the current source.
  const sync = (): void => {
    const value = resolve()
    if (disposeSection !== undefined) {
      disposeSection()
      disposeSection = undefined
    }
    if (disposeRoutes !== undefined) {
      disposeRoutes()
      disposeRoutes = undefined
    }
    if (!value.enabled) {
      void mcp.dispose()
      return
    }
    if (value.announceToAgent) {
      disposeSection = ctx.systemPrompt.section({
        name: 'plugin:skills-mcp-manager',
        order: SECTION_ORDER,
        text: SKILLS_MCP_GUIDANCE,
      })
    }
    disposeRoutes = ctx.effect(
      () => {
        const disposers = routes.map((route) => ctx.webServer.register(route))
        return () => { for (const dispose of disposers) dispose() }
      },
      'skills-mcp-manager: routes',
    )
    // Connect enabled servers from the persisted document.
    void mcp.reload()
  }

  installSettingsSection(ctx, SKILLS_MCP_NAMESPACE, Config, config ?? {}, {
    setSource: (source) => {
      current = source
      sync()
    },
    onChange: sync,
  })

  // Teardown every MCP connection when the plugin unloads.
  ctx.effect(() => () => { void mcp.dispose() }, 'skills-mcp-manager: mcp')

  sync()
}
