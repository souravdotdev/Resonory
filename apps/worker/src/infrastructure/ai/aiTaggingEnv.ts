import { z } from "zod";

export interface AiTaggingEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Groq's OpenAI-compatible endpoint (Items ADR 0004). */
export const DEFAULT_AI_TAGGING_BASE_URL = "https://api.groq.com/openai/v1";

/** A Groq production model that answers in JSON mode. */
export const DEFAULT_AI_TAGGING_MODEL = "openai/gpt-oss-20b";

// An optional setting whose empty value (`AI_TAGGING_API_KEY=` in a .env file) counts as unset.
const unsetWhenEmpty = <T extends z.ZodType>(value: T) =>
  z.preprocess((raw) => (raw === "" ? undefined : raw), value.optional());

// zod's plain url() also accepts "api.groq.com/openai/v1".
const schema = z.object({
  AI_TAGGING_API_KEY: unsetWhenEmpty(z.string()),
  AI_TAGGING_BASE_URL: unsetWhenEmpty(z.url({ protocol: /^https?$/ })),
  AI_TAGGING_MODEL: unsetWhenEmpty(z.string()),
});

/**
 * AI tagging's settings from the environment, or null when `AI_TAGGING_API_KEY`
 * is unset (or empty): the worker then runs without AI tagging. The base URL
 * and model default to Groq's. A base URL that is set but isn't an http(s) one
 * is a mistake, so it throws at startup instead.
 */
export function aiTaggingEnv(env: NodeJS.ProcessEnv): AiTaggingEnv | null {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables in the worker:\n${issues}`);
  }
  const {
    AI_TAGGING_API_KEY: apiKey,
    AI_TAGGING_BASE_URL: baseUrl = DEFAULT_AI_TAGGING_BASE_URL,
    AI_TAGGING_MODEL: model = DEFAULT_AI_TAGGING_MODEL,
  } = parsed.data;
  return apiKey ? { apiKey, baseUrl, model } : null;
}
