import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts validates process.env once, at import time, so each test stubs the
// environment and then imports a fresh copy of the module.
function loadEnv(overrides: Record<string, string | undefined> = {}) {
  for (const [name, value] of Object.entries(overrides)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  return import("./env").then((module) => module.loggerEnv);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("logger env", () => {
  it("defaults NODE_ENV to development and leaves LOG_LEVEL unset", async () => {
    const env = await loadEnv({ NODE_ENV: undefined, LOG_LEVEL: undefined });

    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBeUndefined();
  });

  it.each(["development", "test", "production"] as const)("accepts NODE_ENV=%s", async (value) => {
    const env = await loadEnv({ NODE_ENV: value });

    expect(env.NODE_ENV).toBe(value);
  });

  it("refuses an invalid NODE_ENV", async () => {
    await expect(loadEnv({ NODE_ENV: "staging" })).rejects.toThrow("NODE_ENV");
  });

  it.each(["fatal", "error", "warn", "info", "debug", "trace", "silent"])(
    "accepts LOG_LEVEL=%s",
    async (value) => {
      const env = await loadEnv({ LOG_LEVEL: value });

      expect(env.LOG_LEVEL).toBe(value);
    },
  );

  it("fails loudly at import time when LOG_LEVEL is invalid", async () => {
    await expect(loadEnv({ LOG_LEVEL: "verbose" })).rejects.toThrow("LOG_LEVEL");
  });
});
