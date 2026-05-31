import { getOctokit } from "@actions/github";
export type PullRequestContext = {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    body: string;
    headSha: string;
};
export type ReviewCommentInput = {
    marker: string;
    body: string;
};
export type GitHubClient = ReturnType<typeof getOctokit>;
export declare function loadPullRequestContext(eventPath: string): Promise<PullRequestContext>;
export declare function getLatestCommitParentSha(github: GitHubClient, pullRequest: PullRequestContext): Promise<string>;
export declare function getLatestCommitDiff(github: GitHubClient, pullRequest: PullRequestContext, range: {
    base: string;
    head: string;
}): Promise<string>;
export declare function upsertReviewComment(github: GitHubClient, pullRequest: PullRequestContext, input: ReviewCommentInput): Promise<void>;
