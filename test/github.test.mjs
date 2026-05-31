import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { loadPullRequestContext, upsertReviewComment } from "../dist/github.js";

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

test("upsertReviewComment updates an existing bot comment", async () => {
  const calls = [];
  const github = {
    rest: {
      issues: {
        listComments: async () => ({
          data: [{ id: 99, body: "<!-- codex-reviewer:latest-commit -->\nold" }],
        }),
        updateComment: async (input) => {
          calls.push(["update", input]);
        },
        createComment: async (input) => {
          calls.push(["create", input]);
        },
      },
    },
  };

  await upsertReviewComment(
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
      marker: "<!-- codex-reviewer:latest-commit -->",
      body: "<!-- codex-reviewer:latest-commit -->\nnew",
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][1].comment_id, 99);
  assert.equal(calls[0][1].body, "<!-- codex-reviewer:latest-commit -->\nnew");
});
