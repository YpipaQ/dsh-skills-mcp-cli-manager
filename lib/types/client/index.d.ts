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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type SkillsMcpKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-skills-mcp-cli-manager surface copy. */
        'skills-mcp-manager': SkillsMcpKey;
    }
}
/** Required services (fiber inject waiting — the runtime must be up first). */
export declare const inject: string[];
/**
 * Mount the settings page.
 * @param ctx - client root context (slots, workspaces, locale).
 */
export declare function apply(ctx: ClientContext): void;
