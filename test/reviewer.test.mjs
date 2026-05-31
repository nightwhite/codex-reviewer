import assert from "node:assert/strict";
import test from "node:test";

import { latestCommitRange, parseCodexReview } from "../dist/reviewer.js";

test("latestCommitRange reviews only the pull request head commit", () => {
  assert.deepEqual(
    latestCommitRange({ headSha: "abc123", parentSha: "def456" }),
    { base: "def456", head: "abc123" },
  );
});

test("latestCommitRange rejects missing parent sha", () => {
  assert.throws(
    () => latestCommitRange({ headSha: "abc123", parentSha: "" }),
    /parent sha/i,
  );
});

test("latestCommitRange rejects missing head sha", () => {
  assert.throws(
    () => latestCommitRange({ headSha: "", parentSha: "def456" }),
    /head sha/i,
  );
});

test("parseCodexReview extracts summary and inline comments from JSON", () => {
  assert.deepEqual(
    parseCodexReview(JSON.stringify({
      summaryMarkdown: "## Summary\nRequest changes.",
      inlineComments: [
        {
          path: "src/app.ts",
          line: 12,
          body: "This can throw.",
        },
      ],
    })),
    {
      summaryMarkdown: "## Summary\nRequest changes.",
      inlineComments: [
        {
          path: "src/app.ts",
          line: 12,
          body: "This can throw.",
        },
      ],
    },
  );
});
