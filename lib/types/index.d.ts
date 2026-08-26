/**
 * dsh-skills-mcp-cli-manager — host half. Mounts the skills filesystem engine,
 * the MCP connection manager (real @deepseek-ai/dsh-mcp-client instances per
 * enabled server), the /api/dsh-skills-mcp route family, and a system-prompt
 * announcement. The browser half (./client) renders the settings card.
 * Everything rides official NPM SDK packages — no dsh source changes.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
/** Stable cordis plugin name. */
export declare const name = "skills-mcp-manager";
/** Services required before the surfaces can mount. `settings` is
 * deliberately absent: installSettingsSection registers it on an inner scoped
 * fiber, so a deployment without the settings surface still gets routes + MCP. */
export declare const inject: string[];
/**
 * Settings namespace this plugin's config lives under. Spelled here rather
 * than imported: the browser half spells the same value and must not depend
 * on a Host package.
 */
export declare const SKILLS_MCP_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /** Master switch (routes, MCP connections, prompt section). */
    enabled?: boolean;
    /** Announce the plugin to every agent's system prompt. */
    announceToAgent?: boolean;
}
export declare const Config: z<Config>;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const SKILLS_MCP_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-skills-mcp-cli-manager \u63D2\u4EF6\uFF08\u6280\u80FD\u4E2D\u5FC3\uFF1A\u6280\u80FD / MCP / CLI \u7BA1\u7406\u5668\uFF09\uFF1A\u8BBE\u7F6E\u9875\u300CWeb UI \u63D2\u4EF6 \u2192 \u6280\u80FD\u4E2D\u5FC3\u300D\u3002\u80FD\u529B\uFF1A\u6D4F\u89C8/\u542F\u7528/\u7981\u7528/\u5220\u9664/\u5BFC\u5165\u6280\u80FD\uFF08\u9879\u76EE\u7EA7 .dsh/skills\u3001.agents/skills \u4E0E\u7528\u6237\u7EA7 ~/.dsh/skills\u3001~/.agents/skills\uFF09\uFF1B\u7BA1\u7406 MCP \u670D\u52A1\u5668\uFF08stdio \u4E0E streamable-http\uFF09\uFF1B\u4EE5\u53CA\u672C\u5730 CLI \u5DE5\u5177\u6E05\u5355\u4E0E\u72B6\u6001\uFF08\u53D1\u73B0 skill \u5185\u5D4C\u7684 CLI \u5305\u88C5\u811A\u672C\u5982 scripts/run-cli\u3001\u4EE5\u53CA\u7CFB\u7EDF CLI \u5982 gh/git/tencent-news-cli\uFF0C\u62A5\u544A\u662F\u5426\u5B89\u88C5/\u7248\u672C/\u9700\u66F4\u65B0/\u5B50\u547D\u4EE4/API-Key \u72B6\u6001\uFF09\u3002MCP \u662F\u771F\u5B9E\u8FDE\u63A5\uFF1A\u542F\u7528\u7684\u670D\u52A1\u5668\u7ECF @deepseek-ai/dsh-mcp-client \u771F\u6B63\u8FDE\u63A5\u5E76\u628A\u5DE5\u5177\u6CE8\u518C\u4E3A mcp__<server>__<tool>\uFF0C\u542F\u7528/\u7981\u7528\u4F1A\u5B9E\u9645\u8FDE\u63A5/\u65AD\u5F00\u3002\u9650\u5236\uFF1AMCP \u670D\u52A1\u5668\u914D\u7F6E\u5B58 ~/.dsh/mcp.json\uFF08\u5BC6\u7801/env \u660E\u6587\u3001\u6743\u9650 0600 \u7531\u7528\u6237\u81EA\u884C\u4FDD\u8BC1\uFF09\uFF1BCLI \u6CE8\u518C\u8868\u5B58 ~/.dsh/cli.json\uFF1B\u6280\u80FD\u542F\u7528/\u7981\u7528\u901A\u8FC7\u6539\u5199 SKILL.md \u524D\u8A00\u5B9E\u73B0\uFF1B\u5220\u9664\u4E3A\u7269\u7406\u5220\u9664\uFF0C\u4E0D\u53EF\u6062\u590D\u3002\u7528\u6237\u63D0\u5230\u300C\u6280\u80FD\u7BA1\u7406 / \u6280\u80FD\u5BFC\u5165 / MCP \u670D\u52A1\u5668 / MCP \u8FDE\u63A5 / CLI \u5DE5\u5177 / CLI \u72B6\u6001\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Mount the skills engine, MCP manager, routes, and announcement.
 * @param ctx - host plugin context carrying settings/webServer/tools/systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare function apply(ctx: Context, config?: Config): void;
