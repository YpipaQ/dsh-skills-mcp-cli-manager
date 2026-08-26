<div align="center">
  🌏 <b>中文</b> · <a href="./README.md">English</a>
</div>

<div align="center">
  <b style="font-size: 1.15em;">一个 DeepSeek Harness (DSH) Web 插件：在同一天设置页里管理「技能 + MCP + CLI」三类 agent 工具。</b><br /><br />
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <a href="https://github.com/zebbkira/dsh-skills-mcp-manager"><img alt="upstream" src="https://img.shields.io/badge/upstream-zebbkira%2Fdsh--skills--mcp--manager-4d6bfe" /></a>
  <a href="https://github.com/zebbkira/dsh-skills-mcp-manager/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/zebbkira/dsh-skills-mcp-manager" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="DSH" src="https://img.shields.io/badge/DSH-0.1.0--rc%2B-4d6bfe" /></a>
</div>

# dsh-skills-mcp-cli-manager

> **技能中心** —— 一个自包含的 DSH Web 插件，在设置页新增一个一级页面，统一管理 agent 的**三类工具**：**技能（Skills）/ MCP 服务器 / 本地 CLI 工具**。
>
> 仅通过 profile bundle patch + 包安装挂载 —— **不改任何 DeepSeek Harness 源码**。本副本是对上游插件的**派生私有改版**（新增 CLI 层 + "技能中心"命名），见 [CREDITS.md](./CREDITS.md)。

## ✨ 它是什么

一个设置页（「Web UI 插件 → 技能中心」），管理 agent 的三类工具：

| 页签 | 管理 | 底层 |
|---|---|---|
| **Skills 技能** | 浏览 / 启用 / 禁用 / 删除 / 导入技能（项目级 + 用户级） | 改写 `SKILL.md` 前言 |
| **MCP 服务** | 新建 / 编辑 / 测试 / 启用 / 禁用 / 删除 MCP 服务器 | 真实 `@deepseek-ai/dsh-mcp-client` 连接（`mcp__<server>__<tool>`） |
| **CLI 工具** | 发现 / 探测本地 CLI 工具；登记系统 CLI | skill 内嵌 `scripts/run-cli` + `~/.dsh/cli.json` |

## 💡 功能

- **技能**：按项目级 / 用户级与来源分组（`.dsh/skills`、`.agents/skills`、`~/.dsh/skills`、`~/.agents/skills`）；经前言（`disable-model-invocation` / `user-invocable`）启用 / 禁用；两步确认物理删除；详情（description / whenToUse / 正文）；从任意目录扫描导入到 `~/.dsh/skills`（原生目录选择器或手写路径）。
- **MCP**：表单或 JSON 编辑；**测试连接**（一次性真实探测）；启用 / 禁用真实连接 / 断开并注册 `mcp__<server>__<tool>` 工具；实时状态（连接中 / 运行中 / 失败 / 已停止）；持久化到 `~/.dsh/mcp.json`。
- **CLI**：自动发现 skill 包装的 CLI（其 `scripts/run-cli.*` / `cli-state.*`，即 tencent-news 模式）；探测是否安装 / 版本 / 需更新 / API-Key 状态（解析 `cli-state` JSON）并列出子命令（解析 `help`）；`~/.dsh/cli.json` 登记系统 CLI（`gh`、`git`、`tencent-news-cli` …），支持启用 / 禁用 / 删除。

## 🚀 安装

> **必须按普通包安装 —— 切勿 junction 链接。** junction 会让依赖（`schemastery` / `react` 等）无法向上解析，并导致包名与 `cordis.patch.yml` 不一致；两者都会让 DSH 启动失败。

```sh
# 从 npm 安装（发布后）：https://www.npmjs.com/package/dsh-skills-mcp-cli-manager
dsh plugin --profile web add dsh-skills-mcp-cli-manager
# 或：npm install dsh-skills-mcp-cli-manager

# 从源码（本仓库 / 克隆后）
dsh plugin --profile web add <本文件夹绝对路径>

# 或安装打包产物
dsh plugin --profile web add <path>/dsh-skills-mcp-cli-manager-<version>.tgz

# 或使用一键脚本
bash scripts/install.sh                                        # macOS / Linux / Git Bash
powershell -ExecutionPolicy Bypass -File scripts/install.ps1   # Windows
```

安装后**重启 DSH 并硬刷新浏览器**（Cmd/Ctrl+Shift+R），进入「设置 → Web UI 插件 → **技能中心**」即可。

## ⚙️ 配置

```yaml
# 本插件自己的设置命名空间（dsh settings）
skills-mcp-manager:
  enabled: true        # 总开关（路由、MCP 连接、CLI 探测）
  announceToAgent: true # 向每个 agent 的系统提示说明本插件
```

运行时状态：

- MCP 服务器：`~/.dsh/mcp.json`（凭证 / headers 明文保存 —— 请保持该文件 `0600`）。
- CLI 注册表：`~/.dsh/cli.json`。

## 🗂️ 仓库结构

```
dsh-skills-mcp-cli-manager/
├── src/                # TypeScript 源码（宿主 + 客户端两半区）
│   ├── index.ts        # 宿主入口（插件加载、设置命名空间、agent 公告）
│   ├── skills.ts       # 技能文件系统引擎
│   ├── mcp.ts          # MCP 配置存储 + 真连接管理器
│   ├── cli.ts          # CLI 发现 / 探测 / 注册表 + cli-state 解析
│   ├── routes.ts       # /api/dsh-skills-mcp 路由族
│   ├── protocol.ts     # 共享类型 + API 路径
│   └── client/         # 浏览器半区（入口、SettingsCard、manager、api、locales、css）
├── lib/                # 构建产物（宿主：index.js；客户端：client.js；types/*）
├── cordis.patch.yml    # DSH bundle patch（包名必须与 package.json 一致）
├── dsh.plugin.json     # DSH 插件清单（id / version / main / client.main）
├── package.json        # npm 包（dsh.bundle.patch + dsh.client）
├── LICENSE / CREDITS.md# MIT + 上游致谢
├── README.md / README.zh.md
├── docs/development.md # 开发说明（构建、上游重同步）
└── scripts/install.*   # 一键安装进 DSH profile
```

## 🛠️ 开发

见 [`docs/development.md`](./docs/development.md)：双半区构建（`tsdown` 重建 `lib/index.js` + `lib/client.js`）、类型检查、上游修复重同步。

## 📄 许可与致谢

- **许可**：[MIT](./LICENSE)。上游插件版权归原作者 — 见 [CREDITS.md](./CREDITS.md)。
- **CLI 层**与**「技能中心」命名**为本改版作者新增。

---

*English: [`README.md`](./README.md).*
