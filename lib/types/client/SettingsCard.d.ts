/**
 * The skills-mcp-manager settings section: a first-class settings page (a
 * `settings.section` entry, a sibling of the Plugins page) that renders the
 * skills/MCP management UI directly. The plugin does NOT read its own settings
 * namespace (third-party namespaces are not exposed to the browser settings
 * surface), so there is no master-switch here; the manager is always shown.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Props the renderer binds for the section. */
export type SkillsMcpSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'skills-mcp-manager'> & InjectFace<{
    pickDirectory: () => Promise<string | null>;
}>;
/**
 * Render the settings section content.
 * @param props - locale copy, the shell's close action, and the picker helper.
 * @returns the section page.
 */
export declare function SkillsMcpSection(props: SkillsMcpSectionProps): import("react").JSX.Element;
