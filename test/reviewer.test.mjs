import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInlineCommentBody,
  formatReviewBody,
  parseCodexReview,
} from "../dist/reviewer.js";

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

test("formatReviewBody makes the PR review clearly branded", () => {
  const body = formatReviewBody(
    "<!-- codex-reviewer:latest-commit -->",
    { base: "base123", head: "head456" },
    "**Verdict:** Request changes.",
  );

  assert.match(body, /^<!-- codex-reviewer:latest-commit -->/);
  assert.match(body, /### \[codex-reviewer\]\(https:\/\/github\.com\/nightwhite\/codex-reviewer\): Code review/);
  assert.match(body, /Reviewed full pull request at: `head456`/);
  assert.match(body, /Range: `base123\.\.\.head456`/);
  assert.match(body, /\*\*Verdict:\*\* Request changes\./);
});

test("formatInlineCommentBody prefixes inline comments with a project link", () => {
  assert.equal(
    formatInlineCommentBody("This can throw."),
    "[codex-reviewer](https://github.com/nightwhite/codex-reviewer): This can throw.",
  );
});
