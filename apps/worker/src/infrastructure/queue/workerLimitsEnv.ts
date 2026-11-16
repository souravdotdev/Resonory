import { z } from "zod";

/** What a worker's BullMQ `Worker` is built with, beyond its queue and connection. */
export interface WorkerLimits {
  /** How many jobs run at once. */
  concurrency: number;
  /** At most `max` jobs started per `duration` ms, across every worker on the queue; unset, no limiter. */
  limiter: { max: number; duration: number } | undefined;
  /** How long (ms) a job may run before it is treated as stalled; unset, BullMQ's default of 30 s. */
  lockDuration: number | undefined;
}

/** Today's behaviour: one job at a time. */
const DEFAULT_CONCURRENCY = 1;

// An optional setting whose empty value (`ITEM_TAGGING_CONCURRENCY=` in a .env file) counts as unset.
const unsetWhenEmpty = <T extends z.ZodType>(value: T) =>
  z.preprocess((raw) => (raw === "" ? undefined : raw), value.optional());

// A positive whole number in plain digits ("1.5", "10s", "0x10" and " " are mistakes).
const positiveInteger = z
  .string()
  .regex(/^\d+$/, "must be a positive whole number")
  .transform(Number)
  .refine((value) => Number.isSafeInteger(value) && value > 0, "must be a positive whole number");

/**
 * A queue's worker settings from the environment, for its `prefix` (for example
 * `ITEM_TAGGING`): `<prefix>_CONCURRENCY`, `<prefix>_RATE_LIMIT_MAX` with
 * `<prefix>_RATE_LIMIT_WINDOW_MS` (both or neither) and
 * `<prefix>_LOCK_DURATION_MS`. Empty counts as unset. Anything set that isn't
 * a positive whole number throws at startup, naming the variable.
 */
export function workerLimitsEnv(env: NodeJS.ProcessEnv, prefix: string): WorkerLimits {
  const names = {
    concurrency: `${prefix}_CONCURRENCY`,
    max: `${prefix}_RATE_LIMIT_MAX`,
    window: `${prefix}_RATE_LIMIT_WINDOW_MS`,
    lockDuration: `${prefix}_LOCK_DURATION_MS`,
  };
  const schema = z
    .object({
      [names.concurrency]: unsetWhenEmpty(positiveInteger),
      [names.max]: unsetWhenEmpty(positiveInteger),
      [names.window]: unsetWhenEmpty(positiveInteger),
      [names.lockDuration]: unsetWhenEmpty(positiveInteger),
    })
    .superRefine((value, ctx) => {
      // Half a rate limit would silently do nothing, so name the half that's missing.
      const hasMax = value[names.max] !== undefined;
      const hasWindow = value[names.window] !== undefined;
      if (hasMax && !hasWindow) {
        ctx.addIssue({
          code: "custom",
          path: [names.window],
          message: `must be set together with ${names.max}`,
        });
      }
      if (hasWindow && !hasMax) {
        ctx.addIssue({
          code: "custom",
          path: [names.max],
          message: `must be set together with ${names.window}`,
        });
      }
    });

  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables in the worker:\n${issues}`);
  }
  const max = parsed.data[names.max];
  const window = parsed.data[names.window];
  return {
    concurrency: parsed.data[names.concurrency] ?? DEFAULT_CONCURRENCY,
    limiter: max !== undefined && window !== undefined ? { max, duration: window } : undefined,
    lockDuration: parsed.data[names.lockDuration],
  };
}
