// Before anything that declares a decorated class.
import "reflect-metadata";
import type { Redis } from "ioredis";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import { createProcessingContainer } from "@/di/processingContainer";
import { WORKER_TOKENS } from "@/di/tokens";
import { workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";
import type { ItemTaggingQueue } from "@/infrastructure/queue/BullMqQueueProvider";
import { createItemProcessingWorker } from "@/interface/itemProcessingWorker";
import { startWorker } from "@/startWorker";

// The processing worker consumes the Item processing queue until it's told to stop,
// separately from the tagging worker. Postgres
// connects lazily, on the first query a job makes.
// An invalid ITEM_PROCESSING_* value stops the worker here, before it connects to anything.
const limits = workerLimitsEnv(process.env, "ITEM_PROCESSING");
const container = createProcessingContainer();
const logger = container.get<Logger>(WORKER_TOKENS.Logger);
const redis = container.get<Redis>(WORKER_TOKENS.RedisConnection);
// The Item tagging queue, produced onto: Processing queues AI tagging jobs there.
const itemTaggingQueue = container.get<ItemTaggingQueue>(WORKER_TOKENS.ItemTaggingQueue);

logger.info(
  {
    concurrency: limits.concurrency,
    rateLimit: limits.limiter
      ? { max: limits.limiter.max, windowMs: limits.limiter.duration }
      : "none",
    lockDurationMs: limits.lockDuration ?? "BullMQ default",
  },
  "worker settings",
);

await startWorker({
  logger,
  redis,
  queue: ITEM_PROCESSING_QUEUE,
  createWorker: () => createItemProcessingWorker(container, redis, limits),
  alsoClose: [itemTaggingQueue],
});
