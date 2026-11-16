import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WORKER_TOKENS } from "@/di/tokens";
import { createRecordingLogger } from "../testLogger";

// ioredis connects as soon as it's constructed, so the shared Redis connection
// is a stand-in. The Postgres client connects lazily, on its first query, which
// no test here makes.
vi.mock("@resonory/db/redis", () => ({ redisConnection: { stub: "redis connection" } }));
// The BullMQ queue the processing worker produces onto would connect to Redis at import, too.
vi.mock("@/infrastructure/queue/itemTaggingQueue", () => ({
  itemTaggingQueue: { stub: "item tagging queue" },
}));

// importing the db client validates DATABASE_URL, so it's stubbed before a fresh
// copy of the container is imported.
async function productionContainer() {
  vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/resonory");
  vi.resetModules();
  const { createProcessingContainer } = await import("@/di/processingContainer");
  // The fresh module graph has its own token Symbols.
  const { WORKER_TOKENS: tokens } = await import("@/di/tokens");
  return { container: createProcessingContainer(), tokens };
}

// The Thumbnail store is bound only with Supabase Storage configured.
function stubSupabaseStorage() {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

// Each test imports the whole container graph afresh, openai's SDK included. That
// is slow when turbo runs the suite beside typecheck and lint, so the default
// 5s isn't enough.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Everything the processing worker needs, and nothing of AI tagging.
const TAGGING_ONLY = ["TagSuggester", "TagItemUseCase"] as const;

describe("the processing worker's production container", () => {
  it.each(
    (Object.keys(WORKER_TOKENS) as (keyof typeof WORKER_TOKENS)[]).filter(
      (name) => !(TAGGING_ONLY as readonly string[]).includes(name),
    ),
  )("resolves WORKER_TOKENS.%s", async (name) => {
    stubSupabaseStorage();
    const { container, tokens } = await productionContainer();

    expect(container.get(tokens[name])).toBeDefined();
  });

  it("holds no AI client, even with an AI tagging key set", async () => {
    vi.stubEnv("AI_TAGGING_API_KEY", "gsk_test");
    const { container, tokens } = await productionContainer();

    expect(container.isBound(tokens.TagSuggester)).toBe(false);
    expect(container.isBound(tokens.TagItemUseCase)).toBe(false);
  });

  it("keeps Thumbnails in Supabase Storage when it is configured", async () => {
    stubSupabaseStorage();
    const { container, tokens } = await productionContainer();
    const { SupabaseThumbnailStore } =
      await import("@/infrastructure/storage/SupabaseThumbnailStore");

    expect(container.get(tokens.ThumbnailStore)).toBeInstanceOf(SupabaseThumbnailStore);
  });

  it.each([
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"],
  ])("starts without Thumbnails when %s is missing", async (missing, set) => {
    vi.stubEnv(missing, "");
    vi.stubEnv(set, set === "SUPABASE_URL" ? "https://project.supabase.co" : "service-role-key");
    const { container, tokens } = await productionContainer();

    // ProcessItemUseCase then gets no store, and downloads no image.
    expect(container.isBound(tokens.ThumbnailStore)).toBe(false);
    expect(container.get(tokens.ProcessItemUseCase)).toBeDefined();
  });

  // As in the API: a URL that is set must be an http(s) one, even without the key.
  it.each([
    ["project.supabase.co", "service-role-key"],
    ["ftp://project.supabase.co", "service-role-key"],
    ["ftp://project.supabase.co", ""],
  ])("refuses to start when SUPABASE_URL is %s", async (url, key) => {
    vi.stubEnv("SUPABASE_URL", url);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);

    await expect(productionContainer()).rejects.toThrow("SUPABASE_URL");
  });
});

describe("thumbnailStore", () => {
  it.each([
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"],
  ])(
    "warns, with no Item id bound, that Thumbnails are off when %s is missing",
    async (missing, set) => {
      vi.stubEnv(missing, "");
      vi.stubEnv(set, set === "SUPABASE_URL" ? "https://project.supabase.co" : "service-role-key");
      vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/resonory");
      vi.resetModules();
      const { thumbnailStore } = await import("@/di/processingContainer");
      const logger = createRecordingLogger();

      const store = thumbnailStore(logger);

      expect(store).toBeNull();
      expect(logger.logs).toEqual([
        {
          level: "warn",
          bindings: {},
          fields: {},
          msg: "Supabase Storage isn't configured; Items get no Thumbnails",
        },
      ]);
    },
  );
});
