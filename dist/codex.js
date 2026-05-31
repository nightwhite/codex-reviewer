import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
export function renderCodexConfig(input) {
    return [
        `model_provider = "${escapeTomlString(input.providerName)}"`,
        `model = "${escapeTomlString(input.model)}"`,
        "",
        `[model_providers.${input.providerName}]`,
        'name = "Codex Reviewer Provider"',
        `base_url = "${escapeTomlString(input.providerBaseUrl)}"`,
        'wire_api = "responses"',
        "",
    ].join("\n");
}
export async function writeCodexConfig(input) {
    await writeFile(path.join(input.codexHome, "config.toml"), renderCodexConfig(input), "utf8");
}
export function buildCodexArgs(input) {
    const args = [
        "exec",
        "--skip-git-repo-check",
        "--cd",
        input.workdir,
        "--output-last-message",
        input.outputFile,
        "--model",
        input.model,
    ];
    if (input.effort && input.effort.trim().length > 0) {
        args.push("--config", `model_reasoning_effort="${escapeTomlString(input.effort)}"`);
    }
    args.push("--sandbox", input.sandbox);
    return args;
}
export async function runCodexReview(input) {
    const outputDir = await mkdtemp(path.join(tmpdir(), "codex-reviewer-"));
    const outputFile = input.outputFile || path.join(outputDir, "final-message.md");
    const args = buildCodexArgs({ ...input, outputFile });
    await new Promise((resolve, reject) => {
        const child = spawn("codex", args, {
            env: buildCodexEnvironment({ codexHome: input.codexHome }),
            stdio: ["pipe", "inherit", "inherit"],
        });
        child.stdin.write(input.prompt);
        child.stdin.end();
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`codex exited with code ${code}`));
        });
    });
    return readFile(outputFile, "utf8");
}
export function buildCodexEnvironment(input) {
    const env = { ...(input.baseEnv ?? process.env) };
    delete env.CODEX_REVIEWER_API_KEY;
    env.CODEX_HOME = input.codexHome;
    env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE = "codex_reviewer_github_action";
    return env;
}
function escapeTomlString(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
