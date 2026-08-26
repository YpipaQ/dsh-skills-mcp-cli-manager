/**
 * /api/dsh-skills-mcp route family — the browser half's only data path.
 * Skills CRUD, MCP CRUD, and a one-shot connection test. Every route carries
 * a loopback-only trust fence (plus browser same-origin markers): these
 * endpoints read/write user files and spawn MCP servers, so a LAN-exposed dsh
 * web deployment must not serve them.
 * @module
 */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import { CliManager } from './cli.ts';
import { McpManager } from './mcp.ts';
import { SkillsManager } from './skills.ts';
export interface RoutesDeps {
    skills: SkillsManager;
    mcp: McpManager;
    cli: CliManager;
}
/**
 * Build every /api/dsh-skills-mcp route (exact paths).
 * @param deps - skills engine, MCP connection manager, and CLI manager.
 * @returns the route registrations.
 */
export declare function makeRoutes(deps: RoutesDeps): {
    routes: WebRoute[];
};
