/**
 * Browser-half entry for the dsh-skills-mcp-cli-manager plugin — runs inside the
 * dsh web GUI. Registers the locale dictionary and contributes a first-class
 * settings PAGE (a settings.section entry, a sibling of the Plugins page),
 * not a card inside any group. The page hosts the skills/MCP management UI,
 * which talks to the Host over /api/dsh-skills-mcp.
 *
 * Deliberately does NOT bind the settingsScope: third-party settings
 * namespaces are not exposed to the browser configuration surface, so a
 * settings-scope-backed section would render an empty shell. The manager is
 * shown directly instead.
 *
 * Failure policy: mounting problems are logged, never thrown — the web shell
 * fails the whole boot when a plugin apply throws, and an external plugin must
 * not take the GUI down.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge (remote.directoryPicker) and the global
// useWorkspaces standard hook merge (ui-workspace) into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the slots merge tables (SlotMap / LocaleNamespaceMap).
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { en, zh, type SkillsMcpKey } from './locales.ts'
import { SkillsMcpSection } from './SettingsCard.tsx'

/** Locale namespace this plugin owns. */
const NS = 'skills-mcp-manager'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-skills-mcp-cli-manager surface copy. */
    'skills-mcp-manager': SkillsMcpKey
  }
}

/** Required services (fiber inject waiting — the runtime must be up first).
 * `settings.section` itself is declared by the settings shell, so mounting
 * only waits on the services this page actually reads. */
export const inject = ['slots', 'locale', 'remote', 'remote.directoryPicker']

/**
 * Mount the settings page.
 * @param ctx - client root context (slots, locale, remote).
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skills-mcp-manager: dictionaries')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills-mcp',
    order: 20,
    label: () => ctx.locale.bind(NS)('title'),
    locale: NS,
    inject: () => ({
      pickDirectory: async (): Promise<string | null> => {
        // DSH 0.1.2-alpha.2 moved directory picking off ctx.workspaces onto
        // the remote.directoryPicker Remote namespace.
        const result = await ctx.remote.directoryPicker.pick()
        if (!result.ok) throw new Error(`directory picker failed: ${result.error.message}`)
        return result.value
      },
    }),
  }, SkillsMcpSection))
}
