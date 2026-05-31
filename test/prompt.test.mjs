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
  ]) {
    assert.match(prompt, new RegExp(phrase, "i"));
  }
});
