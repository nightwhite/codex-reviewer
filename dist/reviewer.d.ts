import { SandboxMode } from "./codex.js";
import { GitHubClient, PullRequestContext } from "./github.js";
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
export declare function latestCommitRange(input: LatestCommitRangeInput): CommitRange;
export declare function runReviewer(input: ReviewerInput): Promise<string>;
