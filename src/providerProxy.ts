import http, { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

export type ProxyRequestInput = {
  upstreamBaseUrl: string;
  apiKey: string;
  path: string;
};

export type ProxyRequestOptions = {
  url: string;
  headers: Record<string, string>;
};

export type ProviderProxy = {
  baseUrl: string;
  close: () => Promise<void>;
};

export function createProxyRequestOptions(input: ProxyRequestInput): ProxyRequestOptions {
  if (input.path !== "/v1/responses") {
    throw new Error("Codex Reviewer proxy only forwards /v1/responses requests.");
  }

  const upstream = new URL(input.upstreamBaseUrl);
  const upstreamPath = upstream.pathname.replace(/\/$/, "");
  upstream.pathname = `${upstreamPath}/responses`;

  return {
    url: upstream.toString(),
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
  };
}

export async function startProviderProxy(input: {
  upstreamBaseUrl: string;
  apiKey: string;
}): Promise<ProviderProxy> {
  const server = http.createServer((request, response) => {
    void proxyResponsesRequest(request, response, input);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("Provider proxy did not bind to a TCP port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function proxyResponsesRequest(
  request: IncomingMessage,
  response: ServerResponse,
  input: { upstreamBaseUrl: string; apiKey: string },
): Promise<void> {
  try {
    if (request.method !== "POST") {
      response.writeHead(405, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Only POST is supported." }));
      return;
    }

    const body = await readRequestBody(request);
    const options = createProxyRequestOptions({
      upstreamBaseUrl: input.upstreamBaseUrl,
      apiKey: input.apiKey,
      path: request.url ?? "",
    });

    const upstreamResponse = await fetch(options.url, {
      method: "POST",
      headers: options.headers,
      body: new Uint8Array(body),
    });

    response.writeHead(upstreamResponse.status, {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    });
    if (upstreamResponse.body) {
      await pipeline(Readable.fromWeb(upstreamResponse.body as ReadableStream), response);
    } else {
      response.end();
    }
  } catch (error) {
    if (response.headersSent || response.destroyed) {
      response.destroy();
      return;
    }
    response.writeHead(502, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
