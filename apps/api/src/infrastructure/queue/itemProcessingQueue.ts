import { Queue } from "bullmq";
import { redisConnection } from "@resonory/db/redis";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";

/**
 * The BullMQ Item processing queue, on the shared Redis connection (BullMQ needs its
 * `maxRetriesPerRequest: null`). Built at import, like the rate-limit Redis, so
 * only the container imports it.
 */
export const itemProcessingQueue = new Queue(ITEM_PROCESSING_QUEUE, {
  connection: redisConnection,
});
