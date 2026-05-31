import { getOctokit } from "@actions/github";
export type PullRequestContext = {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    body: string;
    headSha: string;
};
export type InlineReviewComment = {
    path: string;
    line: number;
    body: string;
};
export type PullRequestReviewInput = {
    body: string;
    commitSha: string;
    comments: InlineReviewComment[];
};
export type GitHubClient = ReturnType<typeof getOctokit>;
export declare function loadPullRequestContext(eventPath: string): Promise<PullRequestContext>;
export declare function getLatestCommitParentSha(github: GitHubClient, pullRequest: PullRequestContext): Promise<string>;
export declare function getLatestCommitDiff(github: GitHubClient, pullRequest: PullRequestContext, range: {
    base: string;
    head: string;
}): Promise<string>;
export declare function createPullRequestReview(github: GitHubClient, pullRequest: PullRequestContext, input: PullRequestReviewInput): Promise<void>;
