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
export type ResolvableDiffLines = Map<string, Set<number>>;
export declare function loadPullRequestContext(eventPath: string): Promise<PullRequestContext>;
export declare function getPullRequestDiff(github: GitHubClient, pullRequest: PullRequestContext): Promise<{
    diff: string;
    base: string;
    head: string;
}>;
export declare function createPullRequestReview(github: GitHubClient, pullRequest: PullRequestContext, input: PullRequestReviewInput): Promise<void>;
export declare function parseResolvableDiffLines(diff: string): ResolvableDiffLines;
export declare function filterResolvableInlineComments(comments: InlineReviewComment[], resolvableLines: ResolvableDiffLines): InlineReviewComment[];
