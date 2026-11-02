import { Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

// base.ts reads NODE_ENV/LOG_LEVEL from the package's env.ts at import time,
// so each test stubs the environment and imports a fresh copy of createLogger
// — the same pattern packages/db and apps/api use for their own env.ts.
function loadCreateLogger(overrides: Record<string, string | undefined> = {}) {
  for (const [name, value] of Object.entries(overrides)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  return import("./base").then((module) => module.createLogger);
}

// An in-memory destination: a real stream pino writes into, not a mock of
// pino itself. Collects each write (one per log call) so a test can inspect
// exactly what was logged. Pretty-printed entries can themselves contain an
// embedded newline (extra bound fields print on their own indented line), so
// a write is the unit, not a text line.
function createMemoryStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, lines: () => chunks };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createLogger", () => {
  it("writes plain structured JSON in production", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.info({ itemId: "item-1" }, "processed");

    const [line] = lines();
    const parsed = JSON.parse(line!);
    expect(parsed.msg).toBe("processed");
    expect(parsed.itemId).toBe("item-1");
  });

  it("writes plain structured JSON in test", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "test" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.info("hello");

    expect(() => JSON.parse(lines()[0]!)).not.toThrow();
  });

  it("writes human-readable, colorized output in local development", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "development" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.info("hello from dev");

    const [line] = lines();
    expect(() => JSON.parse(line!)).toThrow();
    expect(line).toContain("hello from dev");
  });

  it("tags every log line with the app name passed to the factory", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "worker" }, stream);
    logger.info("hello");

    const parsed = JSON.parse(lines()[0]!);
    expect(parsed.app).toBe("worker");
  });

  it("defaults to info level in production", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.debug("too quiet to show");
    logger.info("shows up");

    expect(lines()).toHaveLength(1);
    expect(JSON.parse(lines()[0]!).msg).toBe("shows up");
  });

  it("defaults to debug level outside production", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "development" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.debug("now it shows up");

    expect(lines()).toHaveLength(1);
  });

  it("overrides the NODE_ENV default level via LOG_LEVEL, with no code change", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production", LOG_LEVEL: "trace" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.trace("very quiet by default, but LOG_LEVEL turned it on");

    expect(lines()).toHaveLength(1);
  });

  it("fails loudly at startup when LOG_LEVEL is invalid", async () => {
    await expect(loadCreateLogger({ LOG_LEVEL: "verbose" })).rejects.toThrow("LOG_LEVEL");
  });

  it("masks a sensitive field wherever it appears in a logged object", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.info(
      { user: { profile: { email: "ada@example.com" } }, token: "secret-token" },
      "signed up",
    );

    const parsed = JSON.parse(lines()[0]!);
    expect(parsed.user.profile.email).toBe("[Redacted]");
    expect(parsed.token).toBe("[Redacted]");
  });

  it("masks a cookie or authorization header on a logged request", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "api" }, stream);
    logger.info(
      { req: { headers: { cookie: "session=abc", authorization: "Bearer xyz" } } },
      "request",
    );

    const parsed = JSON.parse(lines()[0]!);
    expect(parsed.req.headers.cookie).toBe("[Redacted]");
    expect(parsed.req.headers.authorization).toBe("[Redacted]");
  });

  it("binds extra bindings alongside the app name", async () => {
    const createLogger = await loadCreateLogger({ NODE_ENV: "production" });
    const { stream, lines } = createMemoryStream();

    const logger = createLogger({ name: "worker", bindings: { itemId: "item-1" } }, stream);
    logger.info("processing");

    const parsed = JSON.parse(lines()[0]!);
    expect(parsed.app).toBe("worker");
    expect(parsed.itemId).toBe("item-1");
  });
});
