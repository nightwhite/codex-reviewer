import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { runReviewer } from "./reviewer.js";
import { loadPullRequestContext } from "./github.js";

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

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
