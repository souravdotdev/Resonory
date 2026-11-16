// Before anything that declares a decorated class.
import "reflect-metadata";
import type { Redis } from "ioredis";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import { createTaggingContainer } from "@/di/taggingContainer";
import { WORKER_TOKENS } from "@/di/tokens";
import { workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";
import { createItemTaggingWorker } from "@/interface/itemTaggingWorker";
import { startWorker } from "@/startWorker";

// The tagging worker consumes the Item tagging queue until it's told to stop,
// separately from the processing worker. Postgres connects lazily, on the first
// query a job makes.
// An invalid ITEM_TAGGING_* value stops the worker here, before it connects to anything.
const limits = workerLimitsEnv(process.env, "ITEM_TAGGING");
const container = createTaggingContainer();
const logger = container.get<Logger>(WORKER_TOKENS.Logger);
const redis = container.get<Redis>(WORKER_TOKENS.RedisConnection);

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
  queue: ITEM_TAGGING_QUEUE,
  createWorker: () => createItemTaggingWorker(container, redis, limits),
});
