import { readFile } from "node:fs/promises";
export async function loadPullRequestContext(eventPath) {
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    const pull = event.pull_request;
    const owner = pull?.base?.repo?.owner?.login ?? event.repository?.owner?.login;
    const repo = pull?.base?.repo?.name ?? event.repository?.name;
    const pullNumber = pull?.number;
    const headSha = pull?.head?.sha;
    if (!owner || !repo || !pullNumber || !headSha) {
        throw new Error("This action requires a pull_request event payload.");
    }
    return {
        owner,
        repo,
        pullNumber,
        title: pull.title ?? "",
        body: pull.body ?? "",
        headSha,
    };
}
export async function getLatestCommitParentSha(github, pullRequest) {
    const response = await github.rest.pulls.listCommits({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.pullNumber,
        per_page: 100,
    });
    const latestCommit = response.data.at(-1);
    if (!latestCommit || latestCommit.sha !== pullRequest.headSha) {
        throw new Error("Could not resolve the latest pull request commit.");
    }
    const parent = latestCommit.parents[0]?.sha;
    if (!parent) {
        throw new Error("Latest commit has no parent sha; cannot review only the latest commit.");
    }
    return parent;
}
export async function getLatestCommitDiff(github, pullRequest, range) {
    const response = await github.rest.repos.compareCommitsWithBasehead({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        basehead: `${range.base}...${range.head}`,
        headers: {
            accept: "application/vnd.github.v3.diff",
        },
    });
    return String(response.data);
}
export async function createPullRequestReview(github, pullRequest, input) {
    await github.rest.pulls.createReview({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.pullNumber,
        commit_id: input.commitSha,
        event: "COMMENT",
        body: input.body,
        comments: input.comments.map((comment) => ({
            path: comment.path,
            line: comment.line,
            side: "RIGHT",
            body: comment.body,
        })),
    });
}
export function parseResolvableDiffLines(diff) {
    const linesByPath = new Map();
    let currentPath = "";
    let newLineNumber = 0;
    for (const line of diff.split("\n")) {
        if (line.startsWith("+++ b/")) {
            currentPath = line.slice("+++ b/".length);
            if (!linesByPath.has(currentPath)) {
                linesByPath.set(currentPath, new Set());
            }
            continue;
        }
        const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunk) {
            newLineNumber = Number(hunk[1]);
            continue;
        }
        if (!currentPath || line.startsWith("diff --git ") || line.startsWith("--- ")) {
            continue;
        }
        if (line.startsWith("+") && !line.startsWith("+++ ")) {
            linesByPath.get(currentPath)?.add(newLineNumber);
            newLineNumber += 1;
            continue;
        }
        if (line.startsWith("-") && !line.startsWith("--- ")) {
            continue;
        }
        newLineNumber += 1;
    }
    return linesByPath;
}
export function filterResolvableInlineComments(comments, resolvableLines) {
    return comments.filter((comment) => resolvableLines.get(comment.path)?.has(comment.line));
}
