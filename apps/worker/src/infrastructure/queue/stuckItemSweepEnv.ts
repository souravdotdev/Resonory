import { z } from "zod";
import {
  parseWorkerEnv,
  positiveInteger,
  unsetWhenEmpty,
} from "@/infrastructure/queue/envSettings";
import {
  BULLMQ_DEFAULT_LOCK_DURATION_MS,
  type WorkerLimits,
} from "@/infrastructure/queue/workerLimitsEnv";

/** How the processing worker finds Items stuck in Processing. */
export interface StuckItemSweepSettings {
  /** How long (ms) an Item may stay Processing before the sweep ends it. */
  stuckAfterMs: number;
  /** How often (ms) the sweep runs. */
  intervalMs: number;
}

/**
 * Longer than an Item's three attempts take (backoff of 5 s and 10 s, plus each
 * attempt's fetches) and than the lock duration, so a job still working or being
 * retried is never swept.
 */
const DEFAULT_STUCK_AFTER_MS = 10 * 60_000;
const DEFAULT_INTERVAL_MS = 5 * 60_000;

const STUCK_AFTER = "ITEM_PROCESSING_STUCK_AFTER_MS";
const INTERVAL = "ITEM_PROCESSING_SWEEP_INTERVAL_MS";

const schema = z.object({
  [STUCK_AFTER]: unsetWhenEmpty(positiveInteger),
  [INTERVAL]: unsetWhenEmpty(positiveInteger),
});

/**
 * The sweep's settings from the environment: `ITEM_PROCESSING_STUCK_AFTER_MS`
 * and `ITEM_PROCESSING_SWEEP_INTERVAL_MS`. Empty counts as unset. Anything set
 * that isn't a positive whole number throws at startup, naming the variable.
 */
export function stuckItemSweepEnv(env: NodeJS.ProcessEnv): StuckItemSweepSettings {
  const parsed = parseWorkerEnv(schema, env);
  return {
    stuckAfterMs: parsed[STUCK_AFTER] ?? DEFAULT_STUCK_AFTER_MS,
    intervalMs: parsed[INTERVAL] ?? DEFAULT_INTERVAL_MS,
  };
}

/** `settings` as a boot log field. */
export function describeStuckItemSweep({ stuckAfterMs, intervalMs }: StuckItemSweepSettings) {
  return { stuckAfterMs, sweepIntervalMs: intervalMs };
}

/**
 * The two waits between a Process Item job's three attempts (5 s, then 10 s),
 * as the API's queue provider sets them. A job being retried is still alive, so
 * the sweep must wait for them too.
 */
const RETRY_BACKOFF_MS = 5_000 + 10_000;

/**
 * Refuses a threshold at or below the lock duration plus the retry backoff: the
 * sweep would then fail an Item whose job is still running or being retried. Throws
 * like an invalid variable, naming both, so a bad pair stops the worker at startup.
 */
export function assertStuckAfterOutlastsLock(
  { stuckAfterMs }: StuckItemSweepSettings,
  { lockDuration }: Pick<WorkerLimits, "lockDuration">,
): void {
  const lock = lockDuration ?? BULLMQ_DEFAULT_LOCK_DURATION_MS;
  if (stuckAfterMs > lock + RETRY_BACKOFF_MS) return;
  throw new Error(
    `Invalid environment variables in the worker:\n  - ${STUCK_AFTER}: ${stuckAfterMs} must be greater than ITEM_PROCESSING_LOCK_DURATION_MS (${lock}) plus the ${RETRY_BACKOFF_MS} ms of retry backoff`,
  );
}
