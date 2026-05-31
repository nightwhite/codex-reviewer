# Codex Reviewer

Codex Reviewer is a GitHub Action that reviews only the latest commit in a pull request by running `codex exec`.

It is built for Codex model providers, not direct ChatGPT-style API calls. The action writes a temporary Codex home with `config.toml` and `auth.json`, then runs `codex exec`.

## What It Reviews

- `pull_request.opened`: reviews the current PR head commit only.
- `pull_request.synchronize`: reviews the new PR head commit only.
- Multi-commit PRs are not reviewed from base to head. The action compares `head.sha^...head.sha`.
- A GitHub PR Review is submitted with a summary and inline review comments when Codex finds line-specific issues.

## Direct Use In This Repository

This repository already includes a ready-to-use workflow at `.github/workflows/codex-review.yml`.

Add these repository settings before enabling it:

- Secret: `CODEX_PROVIDER_BASE_URL`, for example `https://api.openai.com/v1`.
- Secret: `CODEX_PROVIDER_API_KEY`.
- Optional variable: `CODEX_REVIEW_MODEL`, defaults to `gpt-5.5` in the bundled workflow.

After that, every `pull_request.opened` and `pull_request.synchronize` run reviews only the latest PR commit.

## Reusable Action Usage

```yaml
name: Codex review

on:
  pull_request_target:
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

      - uses: nightwhite/codex-reviewer@v1
        with:
          github-token: ${{ github.token }}
          provider-base-url: ${{ secrets.CODEX_PROVIDER_BASE_URL }}
          provider-api-key: ${{ secrets.CODEX_PROVIDER_API_KEY }}
          model: gpt-5.5
          effort: high
          sandbox: read-only
```

## Provider Contract

Set `provider-base-url` to a real Responses-compatible provider URL that GitHub Actions can reach, for example:

```yaml
provider-base-url: https://api.openai.com/v1
provider-api-key: ${{ secrets.CODEX_PROVIDER_API_KEY }}
model: gpt-5.5
```

The reusable workflow uses `pull_request_target` so fork pull requests can be reviewed with repository secrets and write a PR review. Keep `actions/checkout` on the default base repository checkout; do not checkout the pull request head before running this action.

Internally, the action writes `provider-base-url` directly into a temporary `CODEX_HOME/config.toml`:

```toml
model_provider = "codex-reviewer"
model = "<model>"

[model_providers.codex-reviewer]
name = "Codex Reviewer Provider"
base_url = "<provider-base-url>"
wire_api = "responses"
requires_openai_auth = true
```

The action writes `provider-api-key` into the temporary `CODEX_HOME/auth.json`:

```json
{
  "OPENAI_API_KEY": "<provider-api-key>",
  "auth_mode": "apikey"
}
```

The request flow is:

```text
Codex CLI -> provider-base-url
```

The provider key is not written to `config.toml` and is removed from the Codex child process environment.

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
| `github-token` | Yes | Token for reading PR data and submitting PR reviews. |
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
- No business third-party API integration.
