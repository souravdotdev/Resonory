import "reflect-metadata";
import OpenAI from "openai";
import { Container } from "inversify";
import type { Logger } from "@resonory/logger";
import { TagItemUseCase } from "@/application/use-cases/items/TagItemUseCase";
import { bindCommon } from "@/di/commonBindings";
import { WORKER_TOKENS } from "@/di/tokens";
import type { ITagSuggester } from "@/domain/providers/ITagSuggester";
import { aiTaggingEnv } from "@/infrastructure/ai/aiTaggingEnv";
import { OpenAiCompatibleTagSuggester } from "@/infrastructure/ai/OpenAiCompatibleTagSuggester";

/**
 * The tagging worker's production container: the shared bindings plus the Tag
 * Item use case and its Tag suggester. No page fetcher, parsers or queue
 * producer: it holds only what AI tagging uses.
 */
export function createTaggingContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });
  const logger = bindCommon(container, "item-tagging-worker");

  // Without an AI tagging key there's no Tag suggester, and every Tag Item job skips its Item.
  const suggester = tagSuggester(logger);
  if (suggester)
    container.bind<ITagSuggester>(WORKER_TOKENS.TagSuggester).toConstantValue(suggester);

  container
    .bind<TagItemUseCase>(WORKER_TOKENS.TagItemUseCase)
    .to(TagItemUseCase)
    .inTransientScope();

  return container;
}

/**
 * An OpenAI-compatible model (Groq by default) when `AI_TAGGING_API_KEY` is
 * set; otherwise none, so the worker still runs, without AI tagging. Retries
 * are BullMQ's (the Tag Item job's backoff), not the client's.
 */
export function tagSuggester(logger: Pick<Logger, "info">): ITagSuggester | null {
  const env = aiTaggingEnv(process.env);
  if (!env) {
    logger.info("AI tagging isn't configured; Items get no AI Tags");
    return null;
  }
  const client = new OpenAI({
    apiKey: env.apiKey,
    baseURL: env.baseUrl,
    maxRetries: 0,
    // The call holds this worker's one job slot, so a hung model is cut off fast
    // and BullMQ's retries (30 s, then 60 s later) cover the rest.
    timeout: 10_000,
  });
  return new OpenAiCompatibleTagSuggester(client, env.model);
}
