import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createPullRequestReview, loadPullRequestContext } from "../dist/github.js";

test("loadPullRequestContext reads the base repository and PR head sha", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "codex-reviewer-event-"));
  const eventPath = path.join(dir, "event.json");
  await writeFile(
    eventPath,
    JSON.stringify({
      repository: {
        owner: { login: "fallback-owner" },
        name: "fallback-repo",
      },
      pull_request: {
        number: 7,
        title: "Improve engine",
        body: null,
        head: {
          sha: "head123",
          repo: { owner: { login: "fork-owner" }, name: "fork-repo" },
        },
        base: {
          repo: { owner: { login: "base-owner" }, name: "base-repo" },
        },
      },
    }),
    "utf8",
  );

  assert.deepEqual(await loadPullRequestContext(eventPath), {
    owner: "base-owner",
    repo: "base-repo",
    pullNumber: 7,
    title: "Improve engine",
    body: "",
    headSha: "head123",
  });
});

test("createPullRequestReview submits a GitHub PR review with inline comments", async () => {
  const calls = [];
  const github = {
    rest: {
      pulls: {
        createReview: async (input) => {
          calls.push(input);
        },
      },
    },
  };

  await createPullRequestReview(
    github,
    {
      owner: "acme",
      repo: "rocket",
      pullNumber: 42,
      title: "",
      body: "",
      headSha: "abc123",
    },
    {
      body: "<!-- codex-reviewer:latest-commit -->\nnew",
      commitSha: "abc123",
      comments: [
        {
          path: "src/app.ts",
          line: 12,
          body: "This can throw on empty input.",
        },
      ],
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].owner, "acme");
  assert.equal(calls[0].repo, "rocket");
  assert.equal(calls[0].pull_number, 42);
  assert.equal(calls[0].commit_id, "abc123");
  assert.equal(calls[0].event, "COMMENT");
  assert.equal(calls[0].body, "<!-- codex-reviewer:latest-commit -->\nnew");
  assert.deepEqual(calls[0].comments, [
    {
      path: "src/app.ts",
      line: 12,
      side: "RIGHT",
      body: "This can throw on empty input.",
    },
  ]);
});
