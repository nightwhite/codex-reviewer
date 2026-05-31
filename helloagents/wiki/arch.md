# 架构设计

```mermaid
flowchart TD
    A[pull_request opened/synchronize] --> B[Load PR context]
    B --> C[List PR commits]
    C --> D[Select head parent...head]
    D --> E[Fetch compare diff]
    E --> F[Start local Responses proxy]
    F --> G[Write temporary CODEX_HOME config]
    G --> H[Run codex exec]
    H --> I[Create or update PR comment]
```

## 关键约束

- 只审查 `pull_request.head.sha` 对应 commit。
- Provider 必须兼容 Codex `wire_api = "responses"`。
- 不实现自动降级或 fallback。
- 默认 Codex sandbox 为 `read-only`。
- Codex 只连接本地 `127.0.0.1` proxy；provider key 不进入 Codex 子进程环境。
