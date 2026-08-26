/**
 * MCP manager — bridges ~/.dsh/mcp.json to real @deepseek-ai/dsh-mcp-client
 * instances. Each enabled server is loaded as a live plugin fiber (its tools
 * are registered on ctx.tools under mcp__<server>__<tool>); toggling a server
 * off disposes its fiber, which disconnects and unregisters the tools. This is
 * the "真连接" layer the dynamic plugin could not provide.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import type { McpServerConfig, McpServerSummary } from './protocol.ts';
/** The ~/.dsh/mcp.json path this manager owns. */
export declare function mcpConfigPath(): string;
/** Read the persisted servers document (never throws). */
export declare function readMcpConfig(): {
    servers: McpServerConfig[];
};
/** Persist the servers document (creating the directory when needed). */
export declare function writeMcpConfig(data: {
    servers: McpServerConfig[];
}): void;
/** Validate one server definition; returns an error string, or null when valid. */
export declare function validateMcpServer(server: unknown): string | null;
/** Normalize a server into its persisted shape (drop transport-irrelevant fields). */
export declare function normalizeMcpServer(server: McpServerConfig): McpServerConfig;
/**
 * Owns the live mcp-client fibers keyed by server name. Loading/disposal is
 * effect-safe: dispose() tears every fiber down (disconnect + tool unregister).
 */
export declare class McpManager {
    private readonly ctx;
    private readonly live;
    private readonly statuses;
    constructor(ctx: Context);
    /** Re-read the persisted document and converge the live fiber set onto it. */
    reload(): Promise<void>;
    /**
     * Converge the live fiber set onto the given enabled server list: dispose
     * removed/changed/disabled servers, then connect newly-enabled ones.
     * @param servers - the complete next server list (enabled flag respected).
     */
    sync(servers: McpServerConfig[]): Promise<void>;
    /** Stop and dispose every live connection (plugin teardown). */
    dispose(): Promise<void>;
    /**
     * One-shot connection probe for the test button: connect with
     * failOnStartupError so a failure rejects, then always dispose. A server
     * that is already live answers ok immediately — re-testing would collide on
     * its reserved serverName namespace.
     */
    testConnect(server: McpServerConfig): Promise<{
        ok: boolean;
        error?: string;
    }>;
    /** Build the UI summary list (persisted config + live status). */
    summarize(servers: McpServerConfig[]): McpServerSummary[];
}
//# sourceMappingURL=mcp.d.ts.map