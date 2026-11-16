import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WORKER_TOKENS } from "@/di/tokens";
import { createRecordingLogger } from "../testLogger";

// ioredis connects as soon as it's constructed, so the shared Redis connection
// is a stand-in. The Postgres client connects lazily, on its first query, which
// no test here makes.
vi.mock("@resonory/db/redis", () => ({ redisConnection: { stub: "redis connection" } }));

// importing the db client validates DATABASE_URL, so it's stubbed before a fresh
// copy of the container is imported.
async function taggingContainer() {
  vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/resonory");
  vi.resetModules();
  const { createTaggingContainer } = await import("@/di/taggingContainer");
  // The fresh module graph has its own token Symbols.
  const { WORKER_TOKENS: tokens } = await import("@/di/tokens");
  return { container: createTaggingContainer(), tokens };
}

// The Tag suggester is bound only with an AI tagging key.
function stubAiTagging() {
  vi.stubEnv("AI_TAGGING_API_KEY", "gsk_test");
}

// Each test imports the whole container graph afresh, openai's SDK included. That
// is slow when turbo runs the suite beside typecheck and lint, so the default
// 5s isn't enough.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// What the tagging worker holds: no page fetcher, parsers or queue producer.
const TAGGING_TOKENS = [
  "Logger",
  "Database",
  "RedisConnection",
  "ItemRepository",
  "TagRepository",
  "TagSuggester",
  "TagItemUseCase",
] as const satisfies readonly (keyof typeof WORKER_TOKENS)[];

describe("the tagging worker's production container", () => {
  it.each(TAGGING_TOKENS)("resolves WORKER_TOKENS.%s", async (name) => {
    stubAiTagging();
    const { container, tokens } = await taggingContainer();

    expect(container.get(tokens[name])).toBeDefined();
  });

  it.each(
    (Object.keys(WORKER_TOKENS) as (keyof typeof WORKER_TOKENS)[]).filter(
      (name) => !(TAGGING_TOKENS as readonly string[]).includes(name),
    ),
  )("binds no WORKER_TOKENS.%s", async (name) => {
    stubAiTagging();
    const { container, tokens } = await taggingContainer();

    expect(container.isBound(tokens[name])).toBe(false);
  });

  it("asks an OpenAI-compatible model when AI_TAGGING_API_KEY is set", async () => {
    stubAiTagging();
    const { container, tokens } = await taggingContainer();
    const { OpenAiCompatibleTagSuggester } =
      await import("@/infrastructure/ai/OpenAiCompatibleTagSuggester");

    expect(container.get(tokens.TagSuggester)).toBeInstanceOf(OpenAiCompatibleTagSuggester);
  });

  it("starts without AI tagging when AI_TAGGING_API_KEY is empty", async () => {
    vi.stubEnv("AI_TAGGING_API_KEY", "");
    const { container, tokens } = await taggingContainer();

    // TagItemUseCase then gets no suggester, and skips every Item.
    expect(container.isBound(tokens.TagSuggester)).toBe(false);
    expect(container.get(tokens.TagItemUseCase)).toBeDefined();
  });

  it.each(["api.groq.com/openai/v1", "ftp://api.groq.com/openai/v1"])(
    "refuses to start when AI_TAGGING_BASE_URL is %s",
    async (url) => {
      stubAiTagging();
      vi.stubEnv("AI_TAGGING_BASE_URL", url);

      await expect(taggingContainer()).rejects.toThrow("AI_TAGGING_BASE_URL");
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
    const { tagSuggester } = await import("@/di/taggingContainer");
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
