import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOKENS } from "@/di/tokens";

// ioredis connects as soon as it's constructed, so the rate-limit Redis and the
// BullMQ Items queue (on the shared Redis connection) are stand-ins. The Postgres
// client connects lazily, on its first query, which no test here makes.
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

// env.ts and the db client validate process.env at import time, so the
// environment is stubbed before a fresh copy of the container is imported.
async function productionContainer(overrides: Record<string, string | undefined> = {}) {
  for (const [name, value] of Object.entries({ ...validEnv, ...overrides })) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { createContainer } = await import("@/di/container");
  // The fresh module graph has its own token Symbols.
  const { TOKENS: tokens } = await import("@/di/tokens");
  return { container: createContainer(), tokens };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// Every case below rebuilds the whole module graph (vi.resetModules),
// re-running every top-level side effect, including real (unreachable in CI
// and locally without the dev services) ioredis/Postgres client construction
// — slow and variable enough on a loaded or CI runner to occasionally miss
// the default 5s test timeout, confirmed on this repo's own CI run. An
// explicit, longer per-test timeout here, not a global bump that would also
// hide a genuine hang elsewhere in the suite.
const SLOW_CONTAINER_TEST_TIMEOUT = 15000;

describe("the production container", () => {
  it.each(Object.keys(TOKENS) as (keyof typeof TOKENS)[])(
    "resolves TOKENS.%s",
    async (name) => {
      const { container, tokens } = await productionContainer();

      expect(container.get(tokens[name])).toBeDefined();
    },
    SLOW_CONTAINER_TEST_TIMEOUT,
  );

  it(
    "signs Thumbnail links with Supabase Storage when it's configured",
    async () => {
      const { container, tokens } = await productionContainer();
      const { SupabaseThumbnailUrlProvider } =
        await import("@/infrastructure/storage/SupabaseThumbnailUrlProvider");

      expect(container.get(tokens.ThumbnailUrlProvider)).toBeInstanceOf(
        SupabaseThumbnailUrlProvider,
      );
    },
    SLOW_CONTAINER_TEST_TIMEOUT,
  );

  // Item cards then carry no Thumbnail (toItemCardOutput with no provider).
  it.each([
    ["neither is set", { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }],
    ["only SUPABASE_URL is set", { SUPABASE_SERVICE_ROLE_KEY: "" }],
    ["only SUPABASE_SERVICE_ROLE_KEY is set", { SUPABASE_URL: undefined }],
  ])(
    "binds no Thumbnail provider when %s",
    async (_case, overrides) => {
      const { container, tokens } = await productionContainer(overrides);

      expect(container.isBound(tokens.ThumbnailUrlProvider)).toBe(false);
      expect(container.isBound(tokens.ThumbnailStorage)).toBe(false);
    },
    SLOW_CONTAINER_TEST_TIMEOUT,
  );
});
