import type { ConnectionOptions, WorkerOptions } from "bullmq";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";

/**
 * The options both queue workers' BullMQ `Worker` is built with: the Redis
 * connection and the concurrency, plus the limiter and lock duration only when
 * set (BullMQ's defaults otherwise).
 */
export function workerOptions(
  connection: ConnectionOptions,
  { concurrency, limiter, lockDuration }: WorkerLimits,
): WorkerOptions {
  return {
    connection,
    concurrency,
    ...(limiter ? { limiter } : {}),
    ...(lockDuration !== undefined ? { lockDuration } : {}),
  };
}
