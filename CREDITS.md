# 致谢与来源声明

`@zebbkira/dsh-skills-mcp-manager` 是一个**派生自上游改版的新产物**：它**不改动上游插件包**，在原「技能 + MCP」两向管理之上，新增了 **CLI 层**（本地 CLI 工具发现 / 探测 / 注册表）并把设置页命名为「技能中心」。

| 包 / 来源 | 吸收了哪些 | 原作者 / 上游仓库 | 许可证 |
|---|---|---|---|
| 技能 + MCP 管理器（上游） | `@zebbkira/dsh-skills-mcp-manager` 的全部前端/宿主逻辑与界面 | ze bbkira (@zebbkira) / [YpipaQ/my-dsh-plugin](https://github.com/YpipaQ/my-dsh-plugin) | MIT |
| DeepSeek Harness 官方 SDK | `@deepseek-ai/dsh-settings`、`@deepseek-ai/dsh-mcp-client`、`@deepseek-ai/dsh-tools`、client-runtime 等依赖 | deepseek-ai / [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | MIT |
| 其余运行时依赖 | `schemastery`、`react`、`react-dom` | 各原作者 | 各自许可证 |

> 说明：本插件**复制并合并**了上游源码（自包含），因此对上游更新免疫；相关版权归原作者。本插件的**新增代码**（CLI 层 `src/cli.ts`、CLI 路由、CLI 页签、设置页「技能中心」命名）由本仓库作者编写，随本包以 MIT 发布。

## 如何跟进上游？

本插件是独立自包含的，不随上游自动变化。如需跟进上游修复（技能/MCP 部分），把对应上游新版源码重新同步到 `src/skills.ts`、`src/mcp.ts`、`src/routes.ts`、`src/client/*`，并在 `src/cli.ts` 保持不变的前提下重跑 `pnpm exec tsdown` 重建 `lib/`。
