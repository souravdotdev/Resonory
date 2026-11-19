// Before anything that declares a decorated class.
import "reflect-metadata";
import type { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";
import { describeError, type Logger } from "@resonory/logger";
import { createProcessingContainer } from "@/di/processingContainer";
import { WORKER_TOKENS } from "@/di/tokens";
import {
  assertStuckAfterOutlastsLock,
  describeStuckItemSweep,
  stuckItemSweepEnv,
} from "@/infrastructure/queue/stuckItemSweepEnv";
import { scheduleStuckItemSweep } from "@/infrastructure/queue/stuckItemSweepSchedule";
import { describeWorkerLimits, workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";
import type { ItemTaggingQueue } from "@/infrastructure/queue/BullMqQueueProvider";
import { createItemProcessingWorker } from "@/interface/itemProcessingWorker";
import { startWorker } from "@/startWorker";

// The processing worker consumes the Item processing queue until it's told to stop,
// separately from the tagging worker. Postgres connects lazily, on the first
// query a job makes.
// An invalid ITEM_PROCESSING_* value stops the worker here, before it connects to anything.
const limits = workerLimitsEnv(process.env, "ITEM_PROCESSING");
const sweep = stuckItemSweepEnv(process.env);
// A threshold the lock duration could outlast would have the sweep fail Items still being worked on.
assertStuckAfterOutlastsLock(sweep, limits);
const container = createProcessingContainer();
const logger = container.get<Logger>(WORKER_TOKENS.Logger);
const redis = container.get<Redis>(WORKER_TOKENS.RedisConnection);
// The Item tagging queue, produced onto: Processing queues AI tagging jobs there.
const itemTaggingQueue = container.get<ItemTaggingQueue>(WORKER_TOKENS.ItemTaggingQueue);
// The Item processing queue, held to register the sweep job on it.
const itemProcessingQueue = container.get<Pick<Queue, "upsertJobScheduler" | "close">>(
  WORKER_TOKENS.ItemProcessingQueue,
);

logger.info(describeWorkerLimits(limits), "worker settings");
logger.info(describeStuckItemSweep(sweep), "stuck Item sweep settings");

await startWorker({
  logger,
  redis,
  queue: ITEM_PROCESSING_QUEUE,
  createWorker: () => createItemProcessingWorker(container, redis, limits),
  alsoClose: [itemTaggingQueue, itemProcessingQueue],
});

// Idempotent: BullMQ keeps one schedule however many workers register it, and a restart refreshes it.
// The worker is already consuming, so a failure here only costs the sweep: log it and carry on.
try {
  await scheduleStuckItemSweep(itemProcessingQueue, sweep);
} catch (error) {
  logger.error(
    { err: describeError(error) },
    "couldn't schedule the stuck Item sweep; the worker keeps processing without it",
  );
}
