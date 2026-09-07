import assert from "node:assert/strict";
import test from "node:test";

import { buildReviewPrompt } from "../dist/prompt.js";

test("buildReviewPrompt limits review scope to the pull request", () => {
  const prompt = buildReviewPrompt({
    owner: "acme",
    repo: "rocket",
    pullNumber: 42,
    headSha: "abc123",
    baseSha: "def456",
    diff: "diff --git a/a.ts b/a.ts\n+const value = 1;",
    title: "Improve rocket",
    body: "Changes thrust calculation.",
  });

  assert.match(prompt, /full pull request diff/i);
  assert.match(prompt, /abc123/);
  assert.match(prompt, /def456\.\.\.abc123/);
  assert.match(prompt, /Include changes from every commit/i);
  assert.match(prompt, /diff --git/);
});

test("buildReviewPrompt encodes senior reviewer criteria", () => {
  const prompt = buildReviewPrompt({
    owner: "acme",
    repo: "rocket",
    pullNumber: 42,
    headSha: "abc123",
    baseSha: "def456",
    diff: "diff --git a/a.ts b/a.ts\n+const value = 1;",
    title: "Improve rocket",
    body: "",
  });

  for (const phrase of [
    "/goal",
    "Role and Goal",
    "Follow this review process in order",
    "Scope Lock",
    "Intent Check",
    "Full Diff Read",
    "Risk-First Review",
    "Production Readiness Review",
    "Evidence Gate",
    "Inline Comment Gate",
    "Detailed Checklist",
    "Blocking Correctness and Security",
    "Data Safety, SQL, and Persistence",
    "Concurrency and Idempotency",
    "LLM and Third-Party Trust Boundaries",
    "Shell, File, and Network Safety",
    "API Design and Compatibility",
    "Markdown and Emoji Style",
    "🚨 critical",
    "⚠️ important",
    "✅ no meaningful findings",
  ]) {
    assert.match(prompt, new RegExp(phrase, "i"));
  }
});

test("buildReviewPrompt requests structured PR review JSON", () => {
  const prompt = buildReviewPrompt({
    owner: "acme",
    repo: "rocket",
    pullNumber: 42,
    headSha: "abc123",
    baseSha: "def456",
    diff: "diff --git a/a.ts b/a.ts\n+const value = 1;",
    title: "Improve rocket",
    body: "",
  });

  assert.match(prompt, /valid JSON only/i);
  assert.match(prompt, /summaryMarkdown/);
  assert.match(prompt, /inlineComments/);
  assert.match(prompt, /"path"/);
  assert.match(prompt, /"line"/);
  assert.match(prompt, /"body"/);
  assert.match(prompt, /"severity"/);
  assert.match(prompt, /"confidence"/);
  assert.match(prompt, /"category"/);
  assert.match(prompt, /Start with \*\*Verdict:\*\*/);
  assert.match(prompt, /Do not output any text outside the JSON/);
});
