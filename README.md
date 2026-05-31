# Codex Reviewer

Codex Reviewer is a GitHub Action that reviews only the latest commit in a pull request by running `codex exec`.

It is built for Codex model providers, not direct ChatGPT-style API calls. The first version supports OpenAI Responses API compatible providers through a temporary local proxy and `CODEX_HOME/config.toml`.

## What It Reviews

- `pull_request.opened`: reviews the current PR head commit only.
- `pull_request.synchronize`: reviews the new PR head commit only.
- Multi-commit PRs are not reviewed from base to head. The action compares `head.sha^...head.sha`.
- Existing bot review comment is updated instead of creating a new comment every run.

## Direct Use In This Repository

This repository already includes a ready-to-use workflow at `.github/workflows/codex-review.yml`.

Add these repository settings before enabling it:

- Secret: `CODEX_PROVIDER_BASE_URL`, for example `https://llm.example.com/v1`.
- Secret: `CODEX_PROVIDER_API_KEY`.
- Optional variable: `CODEX_REVIEW_MODEL`, defaults to `gpt-5.5` in the bundled workflow.

After that, every `pull_request.opened` and `pull_request.synchronize` run reviews only the latest PR commit.

## Reusable Action Usage

```yaml
name: Codex review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      - uses: your-org/codex-reviewer@v1
        with:
          github-token: ${{ github.token }}
          provider-base-url: ${{ secrets.CODEX_PROVIDER_BASE_URL }}
          provider-api-key: ${{ secrets.CODEX_PROVIDER_API_KEY }}
          model: gpt-5.5
          effort: high
```

## Provider Contract

The provider must be compatible with Codex `wire_api = "responses"`:

The generated Codex config points to a local proxy:

```toml
model_provider = "codex-reviewer"
model = "<model>"

[model_providers.codex-reviewer]
name = "Codex Reviewer Provider"
base_url = "http://127.0.0.1:<port>/v1"
wire_api = "responses"
```

The upstream `provider-base-url` and `provider-api-key` stay in the Action process. Codex only talks to `127.0.0.1`; the provider key is not written to `config.toml` and is not exposed in the Codex child process environment.

## Review Criteria

The Codex prompt instructs the reviewer to inspect only the latest commit for:

- Correctness bugs and behavior regressions.
- Security vulnerabilities and secret exposure.
- Performance regressions and unbounded work.
- Missing tests for changed behavior and edge cases.
- API design, encapsulation, and modularity problems.
- Files or modules that become too long to review, navigate, or test safely.

Findings must be actionable and tied to concrete risks. If there are no meaningful findings, the review should say so instead of inventing comments.

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `github-token` | Yes | Token for reading PR data and writing comments. |
| `provider-base-url` | Yes | Responses-compatible provider base URL. |
| `provider-api-key` | Yes | API key for the provider. |
| `model` | Yes | Model name requested by Codex. |
| `codex-version` | No | Version of `@openai/codex` to install. Defaults to `latest`. |
| `effort` | No | Codex reasoning effort. |
| `working-directory` | No | Directory passed to `codex exec --cd`. |
| `sandbox` | No | Codex sandbox mode. Defaults to `read-only`. |

## Non-Goals

- No Chat Completions to Responses conversion.
- No automatic provider fallback.
- No inline review comments in the first version.
- No business third-party API integration.
