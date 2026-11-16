// Before anything that declares a decorated class.
import "reflect-metadata";
import type { Redis } from "ioredis";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import { createTaggingContainer } from "@/di/taggingContainer";
import { WORKER_TOKENS } from "@/di/tokens";
import { createItemTaggingWorker } from "@/interface/itemTaggingWorker";

// The tagging worker consumes the Item tagging queue until it's told to stop,
// separately from the processing worker. Postgres connects lazily, on the first
// query a job makes.
const container = createTaggingContainer();
const logger = container.get<Logger>(WORKER_TOKENS.Logger);
const redis = container.get<Redis>(WORKER_TOKENS.RedisConnection);

await redis.ping();
const taggingWorker = createItemTaggingWorker(container, redis);
logger.info({ queue: ITEM_TAGGING_QUEUE }, "connected; consuming the queue");

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "signal received; finishing the current job and closing");
  await taggingWorker.close();
  await redis.quit();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
