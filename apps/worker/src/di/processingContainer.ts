import "reflect-metadata";
import { StorageClient } from "@supabase/storage-js";
import { Container } from "inversify";
import type { Logger } from "@resonory/logger";
import { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import { SweepStuckItemsUseCase } from "@/application/use-cases/items/SweepStuckItemsUseCase";
import { bindCommon } from "@/di/commonBindings";
import { WORKER_TOKENS } from "@/di/tokens";
import type { IImageFetcher } from "@/domain/providers/IImageFetcher";
import type { IJsonFetcher } from "@/domain/providers/IJsonFetcher";
import type { IOEmbedProvider } from "@/domain/providers/IOEmbedProvider";
import type { IPageHeadParser } from "@/domain/providers/IPageHeadParser";
import type { IQueueProvider } from "@/domain/providers/IQueueProvider";
import type { ITextExtractor } from "@/domain/providers/ITextExtractor";
import type { IThumbnailResizer } from "@/domain/providers/IThumbnailResizer";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IUrlFetcher } from "@/domain/providers/IUrlFetcher";
import type { IUrlPreviewCache } from "@/domain/providers/IUrlPreviewCache";
import { RedisUrlPreviewCache } from "@/infrastructure/cache/RedisUrlPreviewCache";
import { GuardedOEmbedProvider } from "@/infrastructure/http/GuardedOEmbedProvider";
import { HtmlPageParser } from "@/infrastructure/http/HtmlPageParser";
import { ReadabilityTextExtractor } from "@/infrastructure/http/ReadabilityTextExtractor";
import { SafeUrlFetcher } from "@/infrastructure/http/SafeUrlFetcher";
import { SharpThumbnailResizer } from "@/infrastructure/images/SharpThumbnailResizer";
import {
  BullMqQueueProvider,
  type ItemTaggingQueue,
} from "@/infrastructure/queue/BullMqQueueProvider";
import { itemTaggingQueue } from "@/infrastructure/queue/itemTaggingQueue";
import { supabaseStorageEnv } from "@/infrastructure/storage/supabaseEnv";
import { SupabaseThumbnailStore } from "@/infrastructure/storage/SupabaseThumbnailStore";

/**
 * The processing worker's production container: the shared bindings plus the
 * page fetcher, parsers, Process Item, Fail Item and Sweep Stuck Items use cases and a producer onto
 * the Item tagging queue, with no AI client (see `taggingContainer.ts`).
 * Infrastructure lives for the process's life; use cases are built fresh for each job.
 */
export function createProcessingContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });

  // Built first, so it can be passed into thumbnailStore() below.
  const logger = bindCommon(container, "item-processing-worker");

  // The Item tagging queue, produced onto: once an Item is Ready, Processing queues its AI tagging.
  container
    .bind<ItemTaggingQueue>(WORKER_TOKENS.ItemTaggingQueue)
    .toConstantValue(itemTaggingQueue);
  container
    .bind<IQueueProvider>(WORKER_TOKENS.QueueProvider)
    .to(BullMqQueueProvider)
    .inSingletonScope();
  // One SafeUrlFetcher serves the page fetch, the oEmbed lookup's JSON and
  // the Thumbnail image download, so all go through the same guard.
  container.bind<IUrlFetcher>(WORKER_TOKENS.UrlFetcher).to(SafeUrlFetcher).inSingletonScope();
  container.bind<IJsonFetcher>(WORKER_TOKENS.JsonFetcher).toService(WORKER_TOKENS.UrlFetcher);
  // Redis is already required for BullMQ, so this has no "unset" case.
  container
    .bind<IUrlPreviewCache>(WORKER_TOKENS.UrlPreviewCache)
    .to(RedisUrlPreviewCache)
    .inSingletonScope();
  container
    .bind<IOEmbedProvider>(WORKER_TOKENS.OEmbedProvider)
    .to(GuardedOEmbedProvider)
    .inSingletonScope();
  container.bind<IImageFetcher>(WORKER_TOKENS.ImageFetcher).toService(WORKER_TOKENS.UrlFetcher);
  container
    .bind<IThumbnailResizer>(WORKER_TOKENS.ThumbnailResizer)
    .to(SharpThumbnailResizer)
    .inSingletonScope();
  container
    .bind<IPageHeadParser>(WORKER_TOKENS.PageHeadParser)
    .to(HtmlPageParser)
    .inSingletonScope();
  container
    .bind<ITextExtractor>(WORKER_TOKENS.TextExtractor)
    .to(ReadabilityTextExtractor)
    .inSingletonScope();
  // Without Supabase Storage there's no Thumbnail store, and Processing fetches no image.
  const store = thumbnailStore(logger);
  if (store) container.bind<IThumbnailStore>(WORKER_TOKENS.ThumbnailStore).toConstantValue(store);
  container
    .bind<ProcessItemUseCase>(WORKER_TOKENS.ProcessItemUseCase)
    .to(ProcessItemUseCase)
    .inTransientScope();
  container
    .bind<FailItemUseCase>(WORKER_TOKENS.FailItemUseCase)
    .to(FailItemUseCase)
    .inTransientScope();
  container
    .bind<SweepStuckItemsUseCase>(WORKER_TOKENS.SweepStuckItemsUseCase)
    .to(SweepStuckItemsUseCase)
    .inTransientScope();

  // A future piece of job-processing business logic (e.g. a logging
  // ProcessItemUseCase) would receive a job-scoped logger via a short-lived
  // Inversify child container built per job, not a constructor-injected
  // WORKER_TOKENS.Logger:
  //
  //   const jobLogger = container.get<Logger>(WORKER_TOKENS.Logger).child({ itemId });
  //   const jobContainer = container.createChild();
  //   jobContainer.bind<Logger>(WORKER_TOKENS.Logger).toConstantValue(jobLogger);
  //   const useCase = jobContainer.get<ProcessItemUseCase>(WORKER_TOKENS.ProcessItemUseCase);
  //
  // createChild() only overrides the rebound token; every other binding
  // falls through unchanged. Not wired up here: nothing in ProcessItemUseCase
  // logs internally yet.

  return container;
}

/**
 * Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
 * set; otherwise none, so the worker still runs, without Thumbnails.
 * Just the Storage part of the Supabase client, as in the API (supabase-js
 * also starts Realtime, which needs a native WebSocket); it sends the service
 * role key the way supabase-js does.
 */
export function thumbnailStore(logger: Pick<Logger, "warn">): IThumbnailStore | null {
  const env = supabaseStorageEnv(process.env);
  if (!env) {
    logger.warn("Supabase Storage isn't configured; Items get no Thumbnails");
    return null;
  }
  const storage = new StorageClient(new URL("storage/v1", env.url).href, {
    apikey: env.serviceRoleKey,
    Authorization: `Bearer ${env.serviceRoleKey}`,
  });
  return new SupabaseThumbnailStore(storage);
}
