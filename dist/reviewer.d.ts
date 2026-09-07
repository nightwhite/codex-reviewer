import { GitHubClient, InlineReviewComment, PullRequestContext } from "./github.js";
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
export declare function runReviewer(input: ReviewerInput): Promise<string>;
export declare function parseCodexReview(rawReview: string): CodexReview;
export declare function formatReviewBody(marker: string, range: CommitRange, review: string): string;
export declare function formatInlineCommentBody(body: string): string;
