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
export async function getPullRequestDiff(github, pullRequest) {
    const params = {
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.pullNumber,
    };
    const before = (await github.rest.pulls.get(params)).data;
    if (before.head.sha !== pullRequest.headSha)
        throw new Error("PR head changed; review cancelled.");
    const response = await github.rest.pulls.get({
        ...params,
        headers: {
            accept: "application/vnd.github.v3.diff",
        },
    });
    const after = (await github.rest.pulls.get(params)).data;
    if (after.head.sha !== before.head.sha || after.base.sha !== before.base.sha) {
        throw new Error("PR range changed; review cancelled.");
    }
    if (typeof response.data !== 'string')
        throw new Error('Expected a PR diff.');
    return { diff: response.data, base: before.base.sha, head: before.head.sha };
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
        if (line.startsWith('diff --git ')) {
            currentPath = '';
            continue;
        }
        if (line.startsWith('\\ No newline'))
            continue;
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
