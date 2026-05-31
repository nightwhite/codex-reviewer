import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { runReviewer } from "./reviewer.js";
import { loadPullRequestContext } from "./github.js";
import { SandboxMode } from "./codex.js";

async function main(): Promise<void> {
  const token = requiredInput("github-token");
  const providerBaseUrl = requiredInput("provider-base-url");
  const providerApiKey = requiredInput("provider-api-key");
  const model = requiredInput("model");
  const eventPath = requiredEnv("GITHUB_EVENT_PATH");

  const review = await runReviewer({
    github: getOctokit(token),
    pullRequest: await loadPullRequestContext(eventPath),
    providerBaseUrl,
    providerApiKey,
    model,
    effort: optionalInput("effort"),
    workdir: optionalInput("working-directory") || process.cwd(),
    sandbox: sandboxInput(optionalInput("sandbox") || "read-only"),
    commentMarker: "<!-- codex-reviewer:latest-commit -->",
  });

  core.setOutput("review", review);
}

function requiredInput(name: string): string {
  const value = readInput(name).trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalInput(name: string): string {
  return readInput(name).trim();
}

function readInput(name: string): string {
  const envName = `INPUT_${name.replace(/-/g, "_").toUpperCase()}`;
  return process.env[envName] ?? "";
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function sandboxInput(value: string): SandboxMode {
  if (value === "read-only" || value === "workspace-write" || value === "danger-full-access") {
    return value;
  }
  throw new Error(`Invalid sandbox: ${value}`);
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
