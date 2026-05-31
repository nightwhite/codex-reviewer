# 项目技术约定

## 技术栈

- Node.js 20
- TypeScript
- GitHub Actions composite action
- Codex CLI

## 开发约定

- 核心逻辑先写测试再实现。
- 不写 provider fallback。
- 不把 API key 写入配置文件。
- 默认只审查 PR 最新 commit。

## 验证

- 构建：`pnpm run build`
- 测试：`pnpm test`
