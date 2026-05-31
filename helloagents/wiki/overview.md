# Codex Reviewer

## 项目概述

Codex Reviewer 是一个 GitHub Action，用于在 Pull Request 创建或更新时运行 `codex exec`，只审查该 PR 当前最新 commit 的 diff。

## 范围

- 范围内：PR `opened` 和 `synchronize` 事件、最新 commit diff、Responses-compatible Codex provider、summary comment。
- 范围外：Chat Completions 协议转换、provider fallback、inline review comments、业务第三方 API。

## 模块

| 模块 | 职责 |
| --- | --- |
| `src/main.ts` | 读取 Action inputs 并启动 reviewer |
| `src/reviewer.ts` | 编排最新 commit 范围、prompt、Codex、评论 |
| `src/github.ts` | GitHub PR 数据、diff、评论 API |
| `src/codex.ts` | Codex provider config 与 `codex exec` |
| `src/providerProxy.ts` | 本地 Responses proxy，隔离 provider key |
| `src/prompt.ts` | 生成限定最新 commit 的 review prompt |
