import "reflect-metadata";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { Container } from "inversify";
import { createLogger } from "@resonory/logger";
import { buildApp } from "@/app";
import { TOKENS } from "@/di/tokens";
import type { Env } from "@/env";
import { IN_MEMORY_RATE_LIMITS, type RateLimitRedis } from "@/rate-limit-store";

const env: Env = {
  PORT: 4000,
  HOST: "127.0.0.1",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:4000",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  WEB_ORIGIN: "https://allowed.example.com",
};

// A minimal container: just what buildApp needs to come up (no auth/items
// routes are exercised here), matching app.test.ts's testContainer().
function testContainer() {
  const container = new Container();
  container.bind(TOKENS.Env).toConstantValue(env);
  container.bind<RateLimitRedis>(TOKENS.RateLimitRedis).toConstantValue(IN_MEMORY_RATE_LIMITS);
  container.bind(TOKENS.Auth).toConstantValue({ handler: async () => Response.json({ ok: true }) });
  return container;
}

// An in-memory destination: a real stream the real Pino instance writes
// NDJSON into, so a test can parse exactly what got logged (the same pattern
// packages/logger/src/base.test.ts uses for createLogger itself).
function createMemoryStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return {
    stream,
    lines: () =>
      chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}

describe("request logging", () => {
  it("logs a request-completion line with the request id, method, url and status", async () => {
    const { stream, lines } = createMemoryStream();
    const loggerInstance = createLogger({ name: "api" }, stream);

    const app = await buildApp(testContainer(), { loggerInstance });

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);

    // Fastify logs the request's method/url when it comes in, and the
    // status code once it's handled, both tagged with the same request id.
    const incomingLine = lines().find((line) => line.msg === "incoming request");
    const completionLine = lines().find((line) => line.msg === "request completed");

    expect(incomingLine).toMatchObject({
      reqId: expect.any(String),
      req: expect.objectContaining({ method: "GET", url: "/health" }),
    });
    expect(completionLine).toMatchObject({
      reqId: incomingLine?.reqId,
      res: expect.objectContaining({ statusCode: 200 }),
      responseTime: expect.any(Number),
    });
  });
});
