import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";

// ioredis connects as soon as it's constructed, so the rate-limit Redis and the
// BullMQ Items queue (on the shared Redis connection) are stand-ins, as in
// di/container.test.ts. The Postgres client connects lazily, on its first
// query, which no test here makes.
vi.mock("@/rate-limit-redis", () => ({ rateLimitRedis: { stub: "rate-limit redis" } }));
vi.mock("@/infrastructure/queue/itemsQueue", () => ({ itemsQueue: { stub: "items queue" } }));

// A complete, valid environment for the API and the database package.
const validEnv = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:4000",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  WEB_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5433/resonory",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("@/app");
});

describe("the API entrypoint", () => {
  it("hands Fastify a pre-built logger instance, not its own default", async () => {
    for (const [name, value] of Object.entries(validEnv)) {
      vi.stubEnv(name, value);
    }

    const buildApp = vi.fn(async (_container: unknown, _options?: Record<string, unknown>) => ({
      listen: vi.fn(async () => {}),
      log: { error: vi.fn() },
    }));
    vi.doMock("@/app", () => ({ buildApp }));

    await import("@/index");

    expect(buildApp).toHaveBeenCalledTimes(1);
    const [, options] = buildApp.mock.calls[0]!;
    expect(options).toHaveProperty("loggerInstance");
    expect(options).not.toHaveProperty("logger");
  });
});
