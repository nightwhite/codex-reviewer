import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("bundled action entrypoint starts under Node.js", () => {
  const result = spawnSync(process.execPath, ["dist/main.cjs"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      INPUT_GITHUB_TOKEN: "token",
      INPUT_PROVIDER_BASE_URL: "https://provider.example/v1",
      INPUT_PROVIDER_API_KEY: "secret",
      INPUT_MODEL: "gpt-5.5",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /Dynamic require/);
  assert.match(result.stdout + result.stderr, /GITHUB_EVENT_PATH is required/);
});
