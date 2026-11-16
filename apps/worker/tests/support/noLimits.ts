import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";

/** Worker limits with nothing set beyond today's one job at a time. */
export const NO_LIMITS: WorkerLimits = {
  concurrency: 1,
  limiter: undefined,
  lockDuration: undefined,
};
