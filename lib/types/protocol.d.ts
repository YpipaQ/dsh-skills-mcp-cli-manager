/**
 * Shared wire contract between the host and browser halves. Types only (no
 * value exports needed by the host side); the API path constants are the one
 * value both halves import so a route rename is a single edit.
 * @module
 */
/** Skill source labels (matching the filesystem root a skill was found in). */
export type SkillSource = 'project-dsh' | 'project-agents' | 'user-dsh' | 'user-agents';
/** Skill level, used for grouping in the UI. */
export type SkillLevel = 'project' | 'user';
/** One skill as listed in the UI. */
export interface SkillSummary {
    name: string;
    description: string;
    whenToUse: string;
    enabled: boolean;
    source: SkillSource;
    level: SkillLevel;
    kind: 'bundle' | 'file';
    /** Absolute filesystem path of the SKILL.md (bundle) or the .md file. */
    path: string;
}
/** A skill with its full body, for the detail view. */
export interface SkillDetail {
    name: string;
    description: string;
    whenToUse: string;
    enabled: boolean;
    content: string;
    path: string;
}
/** A candidate skill found by scanning an arbitrary directory. */
export interface ScannedSkill {
    name: string;
    description: string;
    sourcePath: string;
    kind: 'bundle' | 'file';
}
/** One item selected for import. */
export interface ImportItem {
    sourcePath: string;
    kind: 'bundle' | 'file';
}
/** Result of importing one skill. */
export interface ImportResult {
    name: string;
    ok: boolean;
    reason?: string;
}
/** MCP transport kinds the manager supports. */
export type McpTransport = 'stdio' | 'streamable-http';
/** One persisted MCP server definition (mirrors ~/.dsh/mcp.json entries). */
export interface McpServerConfig {
    name: string;
    transport: McpTransport;
    enabled?: boolean;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    url?: string;
    headers?: Record<string, string>;
}
/** Connection state the manager reports for one server. */
export type McpConnectionStatus = 'connecting' | 'running' | 'failed' | 'stopped';
/** One MCP server as returned to the UI (full config + live connection state). */
export interface McpServerSummary extends McpServerConfig {
    status: McpConnectionStatus;
    error?: string;
}
/** API paths shared by the host routes and the browser api client. */
export declare const SKILLS_MCP_API: {
    readonly skills: "/api/dsh-skills-mcp/skills";
    readonly skillRead: "/api/dsh-skills-mcp/skills/read";
    readonly skillToggle: "/api/dsh-skills-mcp/skills/toggle";
    readonly skillDelete: "/api/dsh-skills-mcp/skills/delete";
    readonly skillScan: "/api/dsh-skills-mcp/skills/scan";
    readonly skillImport: "/api/dsh-skills-mcp/skills/import";
    readonly mcp: "/api/dsh-skills-mcp/mcp";
    readonly mcpSave: "/api/dsh-skills-mcp/mcp/save";
    readonly mcpEnabled: "/api/dsh-skills-mcp/mcp/enabled";
    readonly mcpDelete: "/api/dsh-skills-mcp/mcp/delete";
    readonly mcpTest: "/api/dsh-skills-mcp/mcp/test";
};
//# sourceMappingURL=protocol.d.ts.map