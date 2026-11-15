import { Queue } from "bullmq";
import { redisConnection } from "@resonory/db/redis";
import { ITEMS_QUEUE } from "@resonory/shared/schemas/queue";

/**
 * The BullMQ Items queue the worker produces onto (Tag Item jobs), on the shared
 * Redis connection it also consumes from. Built at import, as in the API, so
 * only the container imports it.
 */
export const itemsQueue = new Queue(ITEMS_QUEUE, { connection: redisConnection });
