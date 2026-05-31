import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildReviewPrompt } from "./prompt.js";
import { runCodexReview, writeCodexAuth, writeCodexConfig } from "./codex.js";
import { createPullRequestReview, getLatestCommitParentSha, getLatestCommitDiff, } from "./github.js";
const projectName = "codex-reviewer";
const projectUrl = "https://github.com/nightwhite/codex-reviewer";
const projectLink = `[${projectName}](${projectUrl})`;
export function latestCommitRange(input) {
    if (!input.headSha.trim()) {
        throw new Error("head sha is required");
    }
    if (!input.parentSha.trim()) {
        throw new Error("parent sha is required");
    }
    return { base: input.parentSha, head: input.headSha };
}
export async function runReviewer(input) {
    const parentSha = await getLatestCommitParentSha(input.github, input.pullRequest);
    const range = latestCommitRange({
        headSha: input.pullRequest.headSha,
        parentSha,
    });
    const diff = await getLatestCommitDiff(input.github, input.pullRequest, range);
    const codexHome = await mkdtemp(path.join(tmpdir(), "codex-reviewer-home-"));
    await writeCodexConfig({
        codexHome,
        providerName: "codex-reviewer",
        providerBaseUrl: input.providerBaseUrl,
        model: input.model,
    });
    await writeCodexAuth({
        codexHome,
        providerApiKey: input.providerApiKey,
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
        }),
        codexHome,
        workdir: input.workdir,
        outputFile: "",
        sandbox: input.sandbox,
        model: input.model,
        effort: input.effort,
    });
    const review = parseCodexReview(rawReview);
    await createPullRequestReview(input.github, input.pullRequest, {
        body: formatReviewBody(input.commentMarker, range, review.summaryMarkdown),
        commitSha: range.head,
        comments: review.inlineComments.map((comment) => ({
            ...comment,
            body: formatInlineCommentBody(comment.body),
        })),
    });
    return review.summaryMarkdown;
}
export function parseCodexReview(rawReview) {
    const parsed = JSON.parse(stripJsonFence(rawReview));
    const summaryMarkdown = typeof parsed.summaryMarkdown === "string" ? parsed.summaryMarkdown.trim() : "";
    if (!summaryMarkdown) {
        throw new Error("Codex review JSON must include summaryMarkdown.");
    }
    const inlineComments = Array.isArray(parsed.inlineComments)
        ? parsed.inlineComments.flatMap(parseInlineComment)
        : [];
    return { summaryMarkdown, inlineComments };
}
function parseInlineComment(value) {
    if (value == null || typeof value !== "object") {
        return [];
    }
    const comment = value;
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
function stripJsonFence(rawReview) {
    const trimmed = rawReview.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced?.[1] ?? trimmed;
}
export function formatReviewBody(marker, range, review) {
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
export function formatInlineCommentBody(body) {
    return `${projectLink}: ${body.trim()}`;
}
