# Codex Reviewer 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 GitHub Action，在 PR 创建和后续提交时运行 Codex，只审查该 PR 最新 commit。

**架构：** Action 外层负责 GitHub 事件、最新 commit diff、Codex provider config 和 PR 评论；Codex CLI 只负责基于 diff 生成 review。第一版只支持 Responses-compatible provider，不做协议转换或 fallback。

**技术栈：** TypeScript、Node.js 20、GitHub Actions、Codex CLI、OpenAI Responses-compatible API。

---

## 文件结构

- 创建：`package.json`，定义构建和测试脚本。
- 创建：`tsconfig.json`，配置 Node 20 TypeScript 编译。
- 创建：`action.yml`，定义可复用 composite GitHub Action。
- 创建：`src/main.ts`，CLI 入口。
- 创建：`src/reviewer.ts`，编排 GitHub diff、Codex 执行、PR 评论。
- 创建：`src/codex.ts`，渲染 Codex provider 配置并执行 `codex exec`。
- 创建：`src/github.ts`，封装 GitHub API 操作。
- 创建：`src/prompt.ts`，生成仅审查最新 commit 的 prompt。
- 创建：`test/*.test.mjs`，覆盖核心行为。
- 创建：`README.md`，记录使用方式和安全边界。

## 任务 1：项目基础

- [ ] 编写 `package.json`、`tsconfig.json`。
- [ ] 添加 `src/` 与 `test/` 目录。
- [ ] 运行 `pnpm test`，预期因为没有测试或源码而失败。

## 任务 2：最新 commit 范围

- [ ] 编写 `test/reviewer.test.mjs`，断言 `latestCommitRange({ headSha: "abc", parentSha: "def" })` 返回 `{ base: "def", head: "abc" }`。
- [ ] 运行 `pnpm test test/reviewer.test.mjs`，预期失败，错误为找不到导出。
- [ ] 在 `src/reviewer.ts` 实现 `latestCommitRange`。
- [ ] 再次运行测试，预期通过。

## 任务 3：Codex provider 配置

- [ ] 编写 `test/codex.test.mjs`，断言 `renderCodexConfig` 包含 `wire_api = "responses"`、`base_url`、`env_key = "CODEX_REVIEWER_API_KEY"`，且不包含真实 API key。
- [ ] 运行测试，预期失败。
- [ ] 在 `src/codex.ts` 实现 `renderCodexConfig` 和 `writeCodexConfig`。
- [ ] 再次运行测试，预期通过。

## 任务 4：Prompt 限定

- [ ] 编写 `test/prompt.test.mjs`，断言 prompt 明确包含“only review latest commit”和 commit SHA。
- [ ] 运行测试，预期失败。
- [ ] 在 `src/prompt.ts` 实现 `buildReviewPrompt`。
- [ ] 再次运行测试，预期通过。

## 任务 5：Codex 执行

- [ ] 编写 `test/codex.test.mjs` 的 `buildCodexArgs` 断言，覆盖 `exec`、`--cd`、`--sandbox`、`--output-last-message`、`--model`。
- [ ] 运行测试，预期失败。
- [ ] 在 `src/codex.ts` 实现 `buildCodexArgs` 和 `runCodexReview`。
- [ ] 再次运行测试，预期通过。

## 任务 6：GitHub Action 编排

- [ ] 在 `src/github.ts` 实现获取 PR head commit parent、compare diff、upsert comment。
- [ ] 在 `src/reviewer.ts` 实现 `runReviewer` 编排。
- [ ] 在 `src/main.ts` 读取 Action inputs 并调用 `runReviewer`。
- [ ] 创建 `action.yml`，安装 Node 20、安装 Codex CLI、运行 `dist/main.js`。

## 任务 7：文档和验证

- [ ] 编写 `README.md`，包含 PR 触发示例、provider 配置、权限、安全边界。
- [ ] 运行 `pnpm install`。
- [ ] 运行 `pnpm test`。
- [ ] 运行 `pnpm run build`。
- [ ] 执行 `rg -n "api[_-]?key|secret|token" src test README.md action.yml`，确认没有硬编码密钥。
