import { Queue } from "bullmq";
import { redisConnection } from "@resonory/db/redis";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";

/**
 * The BullMQ Item tagging queue the processing worker produces onto (Tag Item
 * jobs), on the shared Redis connection. Built at import, as in the API, so
 * only the container imports it.
 */
export const itemTaggingQueue = new Queue(ITEM_TAGGING_QUEUE, { connection: redisConnection });
