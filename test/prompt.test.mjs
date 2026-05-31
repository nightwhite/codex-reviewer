import assert from "node:assert/strict";
import test from "node:test";

import { buildReviewPrompt } from "../dist/prompt.js";

test("buildReviewPrompt limits review scope to the latest commit", () => {
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

  assert.match(prompt, /only review the latest commit/i);
  assert.match(prompt, /abc123/);
  assert.match(prompt, /def456\.\.\.abc123/);
  assert.match(prompt, /Do not review older commits/i);
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
    "correctness bugs",
    "security vulnerabilities",
    "performance regressions",
    "missing tests",
    "API design",
    "encapsulation",
    "modularity",
    "files that are too long",
    "actionable",
    "line-specific",
    "read-only",
    "Do not modify files",
    "Do not run commands that mutate",
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
});
