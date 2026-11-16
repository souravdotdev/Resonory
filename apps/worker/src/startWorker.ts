import type { Redis } from "ioredis";
import type { Worker } from "bullmq";
import type { Logger } from "@resonory/logger";

interface StartWorkerOptions {
  logger: Logger;
  redis: Redis;
  /** The queue the worker consumes, for the "connected" log line. */
  queue: string;
  /** Builds the worker; called once Redis has answered. */
  createWorker: () => Worker;
  /** Closed after the worker and before Redis, on shutdown. */
  alsoClose?: { close(): Promise<void> }[];
}

/**
 * The boot and shutdown sequence both worker entry points share. It pings Redis,
 * starts the worker and logs it is connected. On SIGINT or SIGTERM it closes
 * the worker (letting the current job finish), then anything in `alsoClose`,
 * then Redis, and exits.
 */
export async function startWorker({
  logger,
  redis,
  queue,
  createWorker,
  alsoClose = [],
}: StartWorkerOptions): Promise<Worker> {
  await redis.ping();
  const worker = createWorker();
  logger.info({ queue }, "connected; consuming the queue");

  async function shutdown(signal: NodeJS.Signals) {
    logger.info({ signal }, "signal received; finishing the current job and closing");
    await worker.close();
    for (const resource of alsoClose) await resource.close();
    await redis.quit();
    process.exit(0);
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return worker;
}
