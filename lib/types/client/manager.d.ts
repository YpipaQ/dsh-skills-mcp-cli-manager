/**
 * The skills + MCP management UI rendered inside the settings card. Pure
 * React (no framework services): every data access goes through SkillsMcpApi,
 * which fetches the /api/dsh-skills-mcp routes. Inline Chinese copy mirrors
 * the original dynamic plugin; the card chrome above stays bilingual.
 */
/** Top-level manager with the Skills / MCP tabs. */
export declare function SkillsMcpManager(props: {
    cwd: string;
    enabled: boolean;
    pickDirectory: () => Promise<string | null>;
}): import("react").JSX.Element;
//# sourceMappingURL=manager.d.ts.map