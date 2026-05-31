import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildReviewPrompt } from "./prompt.js";
import { runCodexReview, SandboxMode, writeCodexConfig } from "./codex.js";
import { startProviderProxy } from "./providerProxy.js";
import {
  GitHubClient,
  PullRequestContext,
  getLatestCommitParentSha,
  getLatestCommitDiff,
  upsertReviewComment,
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
  sandbox: SandboxMode;
  commentMarker: string;
};

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

    const review = await runCodexReview({
      prompt: buildReviewPrompt({
        owner: input.pullRequest.owner,
        repo: input.pullRequest.repo,
        pullNumber: input.pullRequest.pullNumber,
        title: input.pullRequest.title,
        body: input.pullRequest.body,
        baseSha: range.base,
        headSha: range.head,
        diff,
      }),
      codexHome,
      workdir: input.workdir,
      outputFile: "",
      sandbox: input.sandbox,
      model: input.model,
      effort: input.effort,
    });

    await upsertReviewComment(input.github, input.pullRequest, {
      marker: input.commentMarker,
      body: formatReviewComment(input.commentMarker, range, review),
    });

    return review;
  } finally {
    await proxy.close();
  }
}

function formatReviewComment(marker: string, range: CommitRange, review: string): string {
  return [
    marker,
    "",
    `Reviewed latest commit: \`${range.head}\``,
    `Range: \`${range.base}...${range.head}\``,
    "",
    review.trim(),
    "",
  ].join("\n");
}
