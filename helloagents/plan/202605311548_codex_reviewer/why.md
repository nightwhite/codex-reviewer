# Codex Reviewer 变更提案

## 背景

当前项目目标是实现一个全新的 GitHub Action，用 Codex 在 CI 中审查 Pull Request。它不是传统的 ChatGPT reviewer，也不是复制旧的 `villesau/ai-codereviewer`，而是以 `openai/codex-action` 的执行模型为参考，直接运行 `codex exec`。

## 目标

- 在 PR 创建或 PR 后续提交时触发。
- 只审查该 PR 当前最新 commit 引入的变更。
- 支持配置 Codex 的第三方模型 API Provider。
- 第一版仅支持 OpenAI Responses API 兼容接口。
- 将 review 结果发布为 PR summary comment。

## 范围内

- GitHub composite Action。
- Node.js/TypeScript 辅助程序。
- 临时生成 `CODEX_HOME/config.toml`。
- 运行 `codex exec` 并读取最后输出。
- 获取 PR 最新 commit diff。
- 创建或更新同一个 bot comment。
- 单元测试覆盖核心逻辑。

## 范围外

- 不实现 Chat Completions 到 Responses 的协议转换。
- 不实现 inline review comments。
- 不实现 provider fallback。
- 不支持非 PR 事件作为第一版主路径。
- 不把业务第三方 API 接入审查流程。

## 成功标准

- `pull_request` 的 `opened`、`synchronize` 事件可以触发 review。
- 对多 commit PR，仅审查 `pull_request.head.sha` 对应 commit 的 diff。
- 用户可以通过 Action inputs 配置 `provider-base-url`、`provider-api-key`、`model`。
- Action 不需要读取仓库外部配置即可运行。
- 核心 TypeScript 测试和构建通过。
