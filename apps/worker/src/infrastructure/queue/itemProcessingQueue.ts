import { Queue } from "bullmq";
import { redisConnection } from "@resonory/db/redis";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";

/**
 * The BullMQ Item processing queue as the processing worker holds it, only to
 * register its repeating sweep job (the API is what adds Process Item jobs), on
 * the shared Redis connection. Built at import, like `itemTaggingQueue`, so only
 * the container imports it.
 */
export const itemProcessingQueue = new Queue(ITEM_PROCESSING_QUEUE, {
  connection: redisConnection,
});
