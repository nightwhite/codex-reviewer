export type SandboxMode = "read-only" | "workspace-write" | "danger-full-access";
export type RenderCodexConfigInput = {
    providerName: string;
    providerBaseUrl: string;
    model: string;
};
export type BuildCodexArgsInput = {
    workdir: string;
    outputFile: string;
    sandbox: SandboxMode;
    model: string;
    effort?: string;
};
export type RunCodexReviewInput = BuildCodexArgsInput & {
    prompt: string;
    codexHome: string;
};
export declare function renderCodexConfig(input: RenderCodexConfigInput): string;
export declare function writeCodexConfig(input: RenderCodexConfigInput & {
    codexHome: string;
}): Promise<void>;
export declare function buildCodexArgs(input: BuildCodexArgsInput): string[];
export declare function runCodexReview(input: RunCodexReviewInput): Promise<string>;
export declare function buildCodexEnvironment(input: {
    codexHome: string;
    baseEnv?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv;
