import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";

import { createProxyRequestOptions, startProviderProxy } from "../dist/providerProxy.js";

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

test("proxy delivers streaming bytes before the upstream completes", async (t) => {
  let completed = false;
  const upstream = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("data: first\n\n");
    setTimeout(() => { completed = true; response.end("data: last\n\n"); }, 300);
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const proxy = await startProviderProxy({
    upstreamBaseUrl: `http://127.0.0.1:${upstream.address().port}/v1`, apiKey: "test",
  });
  t.after(() => proxy.close());
  const response = await fetch(`${proxy.baseUrl}/responses`, { method: "POST", body: "{}" });
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(completed, false);
  assert.match(new TextDecoder().decode(first.value), /data: first/);
  while (!(await reader.read()).done) {}
});

test("upstream body failure terminates the response without crashing the proxy", async (t) => {
  let requests = 0;
  const upstream = http.createServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("data: first\n\n");
    setTimeout(() => response.destroy(), 50);
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const proxy = await startProviderProxy({
    upstreamBaseUrl: `http://127.0.0.1:${upstream.address().port}/v1`, apiKey: "test",
  });
  t.after(() => proxy.close());
  await assert.rejects(async () => {
    const response = await fetch(`${proxy.baseUrl}/responses`, { method: "POST", body: "{}" });
    await response.text();
  });
  assert.equal(requests, 1);
  const alive = await fetch(`${proxy.baseUrl}/responses`);
  assert.equal(alive.status, 405);
});
