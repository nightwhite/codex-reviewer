import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildReviewPrompt } from "./prompt.js";
import { runCodexReview, writeCodexConfig } from "./codex.js";
import { startProviderProxy } from "./providerProxy.js";
import {
  GitHubClient,
  InlineReviewComment,
  PullRequestContext,
  createPullRequestReview,
  filterResolvableInlineComments,
  getLatestCommitParentSha,
  getLatestCommitDiff,
  parseResolvableDiffLines,
} from "./github.js";

export type LatestCommitRangeInput = {
  headSha: string;
  parentSha: string;
};

export type CommitRange = {
  base: string;
  head: string;
};

export type ReviewerInput = {
  github: GitHubClient;
  pullRequest: PullRequestContext;
  providerBaseUrl: string;
  providerApiKey: string;
  model: string;
  effort?: string;
  workdir: string;
  commentMarker: string;
};

export type CodexReview = {
  summaryMarkdown: string;
  inlineComments: InlineReviewComment[];
};

const projectName = "codex-reviewer";
const projectUrl = "https://github.com/nightwhite/codex-reviewer";
const projectLink = `[${projectName}](${projectUrl})`;

export function latestCommitRange(input: LatestCommitRangeInput): CommitRange {
  if (!input.headSha.trim()) {
    throw new Error("head sha is required");
  }
  if (!input.parentSha.trim()) {
    throw new Error("parent sha is required");
  }
  return { base: input.parentSha, head: input.headSha };
}

export async function runReviewer(input: ReviewerInput): Promise<string> {
  const parentSha = await getLatestCommitParentSha(input.github, input.pullRequest);
  const range = latestCommitRange({
    headSha: input.pullRequest.headSha,
    parentSha,
  });
  const diff = await getLatestCommitDiff(input.github, input.pullRequest, range);
  const resolvableLines = parseResolvableDiffLines(diff);
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-reviewer-home-"));
  const proxy = await startProviderProxy({
    upstreamBaseUrl: input.providerBaseUrl,
    apiKey: input.providerApiKey,
  });

  try {
    await writeCodexConfig({
      codexHome,
      providerName: "codex-reviewer",
      providerBaseUrl: proxy.baseUrl,
      model: input.model,
    });

    const rawReview = await runCodexReview({
      prompt: buildReviewPrompt({
        owner: input.pullRequest.owner,
        repo: input.pullRequest.repo,
        pullNumber: input.pullRequest.pullNumber,
        title: input.pullRequest.title,
        body: input.pullRequest.body,
        baseSha: range.base,
        headSha: range.head,
        diff,
        resolvableLines,
      }),
      codexHome,
      workdir: input.workdir,
      outputFile: "",
      model: input.model,
      effort: input.effort,
    });
    const review = parseCodexReview(rawReview);

    await createPullRequestReview(input.github, input.pullRequest, {
      body: formatReviewBody(input.commentMarker, range, review.summaryMarkdown),
      commitSha: range.head,
      comments: filterResolvableInlineComments(review.inlineComments, resolvableLines).map(
        (comment) => ({
          ...comment,
          body: formatInlineCommentBody(comment.body),
        }),
      ),
    });

    return review.summaryMarkdown;
  } finally {
    await proxy.close();
  }
}

export function parseCodexReview(rawReview: string): CodexReview {
  const parsed = JSON.parse(stripJsonFence(rawReview)) as {
    summaryMarkdown?: unknown;
    inlineComments?: unknown;
  };
  const summaryMarkdown = typeof parsed.summaryMarkdown === "string" ? parsed.summaryMarkdown.trim() : "";
  if (!summaryMarkdown) {
    throw new Error("Codex review JSON must include summaryMarkdown.");
  }
  const inlineComments = Array.isArray(parsed.inlineComments)
    ? parsed.inlineComments.flatMap(parseInlineComment)
    : [];

  return { summaryMarkdown, inlineComments };
}

function parseInlineComment(value: unknown): InlineReviewComment[] {
  if (value == null || typeof value !== "object") {
    return [];
  }
  const comment = value as Record<string, unknown>;
  const pathValue = comment.path;
  const lineValue = comment.line;
  const bodyValue = comment.body;
  if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
    return [];
  }
  if (typeof lineValue !== "number" || !Number.isInteger(lineValue) || lineValue <= 0) {
    return [];
  }
  if (typeof bodyValue !== "string" || bodyValue.trim().length === 0) {
    return [];
  }
  return [
    {
      path: pathValue.trim(),
      line: lineValue,
      body: bodyValue.trim(),
    },
  ];
}

function stripJsonFence(rawReview: string): string {
  const trimmed = rawReview.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? trimmed;
}

export function formatReviewBody(marker: string, range: CommitRange, review: string): string {
  return [
    marker,
    "",
    `### ${projectLink}: Code review`,
    "",
    `Reviewed latest commit: \`${range.head}\``,
    `Range: \`${range.base}...${range.head}\``,
    "",
    review.trim(),
    "",
  ].join("\n");
}

export function formatInlineCommentBody(body: string): string {
  return `${projectLink}: ${body.trim()}`;
}
