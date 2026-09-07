import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getPullRequestDiff,
  createPullRequestReview,
  filterResolvableInlineComments,
  loadPullRequestContext,
  parseResolvableDiffLines,
} from "../dist/github.js";

test("PR diff uses the PR endpoint and rejects a moving head", async () => {
  const calls = [];
  let head = 'head123';
  const github = { rest: { pulls: { get: async (input) => {
    calls.push(input);
    return { data: input.headers ? 'full PR diff' : {head: {sha: head}, base: {sha: 'base123'}} };
  } } } };
  const pull = {owner: 'acme', repo: 'rocket', pullNumber: 42, headSha: 'head123'};
  assert.deepEqual(await getPullRequestDiff(github, pull), {diff: 'full PR diff', base: 'base123', head: 'head123'});
  assert.equal(calls[1].pull_number, 42);
  head = 'new-head';
  await assert.rejects(getPullRequestDiff(github, pull), /changed/);
});

test("no-newline markers do not shift later added comment positions", () => {
  const diff = 'diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1,2 @@\n-old\n\\ No newline at end of file\n+new\n+second\n';
  assert.deepEqual(parseResolvableDiffLines(diff).get('a'), new Set([1, 2]));
});

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

test("parseResolvableDiffLines returns only added right-side diff lines", () => {
  const diff = [
    "diff --git a/src/app.ts b/src/app.ts",
    "index 1111111..2222222 100644",
    "--- a/src/app.ts",
    "+++ b/src/app.ts",
    "@@ -10,3 +20,4 @@ export function app() {",
    " context();",
    "-removed();",
    "+added();",
    "+changed();",
    "}",
  ].join("\n");

  assert.deepEqual(parseResolvableDiffLines(diff), new Map([
    ["src/app.ts", new Set([21, 22])],
  ]));
});

test("filterResolvableInlineComments drops comments outside added diff lines", () => {
  const resolvableLines = new Map([
    ["web/src/components/dashboard/DashboardData.ts", new Set([2, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 74, 75, 76, 77, 240, 277, 278, 279])],
  ]);

  assert.deepEqual(
    filterResolvableInlineComments(
      [
        {
          path: "web/src/components/dashboard/DashboardData.ts",
          line: 251,
          body: "This line is unchanged context and GitHub cannot resolve it.",
        },
        {
          path: "web/src/components/dashboard/DashboardData.ts",
          line: 240,
          body: "This is an added line in the latest diff.",
        },
      ],
      resolvableLines,
    ),
    [
      {
        path: "web/src/components/dashboard/DashboardData.ts",
        line: 240,
        body: "This is an added line in the latest diff.",
      },
    ],
  );
});
