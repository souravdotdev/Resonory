import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WORKER_TOKENS } from "@/di/tokens";
import { createRecordingLogger } from "../testLogger";

// ioredis connects as soon as it's constructed, so the shared Redis connection
// is a stand-in. The Postgres client connects lazily, on its first query, which
// no test here makes.
vi.mock("@resonory/db/redis", () => ({ redisConnection: { stub: "redis connection" } }));
// The BullMQ queue the worker produces onto would connect to Redis at import, too.
vi.mock("@/infrastructure/queue/itemsQueue", () => ({ itemsQueue: { stub: "items queue" } }));

// importing the db client validates DATABASE_URL, so it's stubbed before a fresh
// copy of the container is imported.
async function productionContainer() {
  vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/resonory");
  vi.resetModules();
  const { createContainer } = await import("@/di/container");
  // The fresh module graph has its own token Symbols.
  const { WORKER_TOKENS: tokens } = await import("@/di/tokens");
  return { container: createContainer(), tokens };
}

// The Thumbnail store is bound only with Supabase Storage configured.
function stubSupabaseStorage() {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

// The Tag suggester is bound only with an AI tagging key.
function stubAiTagging() {
  vi.stubEnv("AI_TAGGING_API_KEY", "gsk_test");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the worker's production container", () => {
  it.each(Object.keys(WORKER_TOKENS) as (keyof typeof WORKER_TOKENS)[])(
    "resolves WORKER_TOKENS.%s",
    async (name) => {
      stubSupabaseStorage();
      stubAiTagging();
      const { container, tokens } = await productionContainer();

      expect(container.get(tokens[name])).toBeDefined();
    },
  );

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

describe("the worker's production container, AI tagging", () => {
  it("asks an OpenAI-compatible model when AI_TAGGING_API_KEY is set", async () => {
    stubAiTagging();
    const { container, tokens } = await productionContainer();
    const { OpenAiCompatibleTagSuggester } =
      await import("@/infrastructure/ai/OpenAiCompatibleTagSuggester");

    expect(container.get(tokens.TagSuggester)).toBeInstanceOf(OpenAiCompatibleTagSuggester);
  });

  it("starts without AI tagging when AI_TAGGING_API_KEY is empty", async () => {
    vi.stubEnv("AI_TAGGING_API_KEY", "");
    const { container, tokens } = await productionContainer();

    // TagItemUseCase then gets no suggester, and skips every Item.
    expect(container.isBound(tokens.TagSuggester)).toBe(false);
    expect(container.get(tokens.TagItemUseCase)).toBeDefined();
  });

  it.each(["api.groq.com/openai/v1", "ftp://api.groq.com/openai/v1"])(
    "refuses to start when AI_TAGGING_BASE_URL is %s",
    async (url) => {
      stubAiTagging();
      vi.stubEnv("AI_TAGGING_BASE_URL", url);

      await expect(productionContainer()).rejects.toThrow("AI_TAGGING_BASE_URL");
    },
  );
});

describe("aiTaggingEnv", () => {
  it("defaults to Groq's endpoint and model when only the key is set", async () => {
    const { aiTaggingEnv } = await import("@/infrastructure/ai/aiTaggingEnv");

    expect(aiTaggingEnv({ AI_TAGGING_API_KEY: "gsk_test" })).toEqual({
      apiKey: "gsk_test",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-20b",
    });
  });

  it("takes another OpenAI-compatible endpoint and model when given", async () => {
    const { aiTaggingEnv } = await import("@/infrastructure/ai/aiTaggingEnv");

    expect(
      aiTaggingEnv({
        AI_TAGGING_API_KEY: "sk-test",
        AI_TAGGING_BASE_URL: "https://api.example.com/v1",
        AI_TAGGING_MODEL: "small-model",
      }),
    ).toEqual({ apiKey: "sk-test", baseUrl: "https://api.example.com/v1", model: "small-model" });
  });

  it.each([{}, { AI_TAGGING_API_KEY: "" }, { AI_TAGGING_MODEL: "small-model" }])(
    "is null without a key: %j",
    async (env) => {
      const { aiTaggingEnv } = await import("@/infrastructure/ai/aiTaggingEnv");

      expect(aiTaggingEnv(env)).toBeNull();
    },
  );
});

describe("tagSuggester", () => {
  it("says at info, with no Item id bound, that AI tagging is off without a key", async () => {
    vi.stubEnv("AI_TAGGING_API_KEY", "");
    vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/resonory");
    vi.resetModules();
    const { tagSuggester } = await import("@/di/container");
    const logger = createRecordingLogger();

    expect(tagSuggester(logger)).toBeNull();
    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: {},
        fields: {},
        msg: "AI tagging isn't configured; Items get no AI Tags",
      },
    ]);
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
      const { thumbnailStore } = await import("@/di/container");
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
