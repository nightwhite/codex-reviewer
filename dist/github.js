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
export async function upsertReviewComment(github, pullRequest, input) {
    const comments = await github.rest.issues.listComments({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        issue_number: pullRequest.pullNumber,
        per_page: 100,
    });
    const existing = comments.data.find((comment) => comment.body?.includes(input.marker));
    if (existing) {
        await github.rest.issues.updateComment({
            owner: pullRequest.owner,
            repo: pullRequest.repo,
            comment_id: existing.id,
            body: input.body,
        });
        return;
    }
    await github.rest.issues.createComment({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        issue_number: pullRequest.pullNumber,
        body: input.body,
    });
}
