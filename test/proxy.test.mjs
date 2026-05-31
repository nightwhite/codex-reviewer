import assert from "node:assert/strict";
import test from "node:test";

import { createProxyRequestOptions } from "../dist/providerProxy.js";

test("createProxyRequestOptions forwards Responses requests to the configured upstream with bearer auth", () => {
  const options = createProxyRequestOptions({
    upstreamBaseUrl: "https://llm.example.test/v1",
    apiKey: "secret-key",
    path: "/v1/responses",
  });

  assert.equal(options.url, "https://llm.example.test/v1/responses");
  assert.equal(options.headers.authorization, "Bearer secret-key");
  assert.equal(options.headers["content-type"], "application/json");
});

test("createProxyRequestOptions rejects non-Responses paths", () => {
  assert.throws(
    () =>
      createProxyRequestOptions({
        upstreamBaseUrl: "https://llm.example.test/v1",
        apiKey: "secret-key",
        path: "/v1/chat/completions",
      }),
    /responses/i,
  );
});
