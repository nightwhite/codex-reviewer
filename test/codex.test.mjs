import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCodexArgs,
  buildCodexEnvironment,
  renderCodexAuth,
  renderCodexConfig,
} from "../dist/codex.js";

test("renderCodexConfig points Codex directly at the configured Responses provider", () => {
  const config = renderCodexConfig({
    providerName: "codex-reviewer",
    providerBaseUrl: "https://provider.example/v1",
    model: "gpt-5.5",
  });

  assert.match(config, /model_provider = "codex-reviewer"/);
  assert.match(config, /model = "gpt-5.5"/);
  assert.match(config, /base_url = "https:\/\/provider\.example\/v1"/);
  assert.match(config, /wire_api = "responses"/);
  assert.match(config, /requires_openai_auth = true/);
  assert.doesNotMatch(config, /sk-/);
});

test("renderCodexAuth writes the provider API key in Codex auth.json format", () => {
  assert.deepEqual(JSON.parse(renderCodexAuth("secret-key")), {
    OPENAI_API_KEY: "secret-key",
    auth_mode: "apikey",
  });
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
      CODEX_PROVIDER_API_KEY: "must-not-leak",
      INPUT_PROVIDER_API_KEY: "must-not-leak",
      OPENAI_API_KEY: "must-not-leak",
    },
  });

  assert.equal(env.CODEX_HOME, "/tmp/codex-home");
  assert.equal(env.PATH, "/bin");
  assert.equal(env.CODEX_REVIEWER_API_KEY, undefined);
  assert.equal(env.CODEX_PROVIDER_API_KEY, undefined);
  assert.equal(env.INPUT_PROVIDER_API_KEY, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
});
