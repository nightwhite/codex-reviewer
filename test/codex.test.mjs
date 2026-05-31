import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexArgs, buildCodexEnvironment, renderCodexConfig } from "../dist/codex.js";

test("renderCodexConfig points Codex at the local Responses proxy without embedding the API key", () => {
  const config = renderCodexConfig({
    providerName: "codex-reviewer",
    providerBaseUrl: "http://127.0.0.1:4321/v1",
    model: "gpt-5.5",
  });

  assert.match(config, /model_provider = "codex-reviewer"/);
  assert.match(config, /model = "gpt-5.5"/);
  assert.match(config, /base_url = "http:\/\/127\.0\.0\.1:4321\/v1"/);
  assert.match(config, /wire_api = "responses"/);
  assert.doesNotMatch(config, /env_key/);
  assert.doesNotMatch(config, /requires_openai_auth/);
  assert.doesNotMatch(config, /sk-/);
});

test("buildCodexArgs creates a deterministic codex exec invocation", () => {
  assert.deepEqual(
    buildCodexArgs({
      workdir: "/repo",
      outputFile: "/tmp/final.md",
      sandbox: "read-only",
      model: "gpt-5.5",
      effort: "high",
    }),
    [
      "exec",
      "--skip-git-repo-check",
      "--cd",
      "/repo",
      "--output-last-message",
      "/tmp/final.md",
      "--model",
      "gpt-5.5",
      "--config",
      'model_reasoning_effort="high"',
      "--sandbox",
      "read-only",
    ],
  );
});

test("buildCodexEnvironment does not expose provider credentials to Codex", () => {
  const env = buildCodexEnvironment({
    codexHome: "/tmp/codex-home",
    baseEnv: {
      PATH: "/bin",
      CODEX_REVIEWER_API_KEY: "must-not-leak",
    },
  });

  assert.equal(env.CODEX_HOME, "/tmp/codex-home");
  assert.equal(env.PATH, "/bin");
  assert.equal(env.CODEX_REVIEWER_API_KEY, undefined);
});
