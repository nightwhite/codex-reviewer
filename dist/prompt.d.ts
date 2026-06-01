export type ReviewPromptInput = {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    body: string;
    baseSha: string;
    headSha: string;
    diff: string;
    resolvableLines?: Map<string, Set<number>>;
};
export declare function buildReviewPrompt(input: ReviewPromptInput): string;
