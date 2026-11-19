import { z } from "zod";
import type { StuckItemSweepSettings } from "@/infrastructure/queue/stuckItemSweepEnv";

/** The name of the repeating job that sweeps Items stuck in Processing, on the Item processing queue. */
export const SWEEP_STUCK_ITEMS_JOB = "sweep-stuck-items";

/** What a sweep job carries: how long an Item may stay Processing before it counts as stuck. */
export const SweepStuckItemsJobSchema = z.object({
  stuckAfterMs: z.number().int().positive(),
});

/** The part of BullMQ's `Queue` the schedule needs. */
interface SweepScheduler {
  upsertJobScheduler(
    schedulerId: string,
    repeat: { every: number },
    template: {
      name: string;
      data: z.infer<typeof SweepStuckItemsJobSchema>;
      opts: { attempts: number; removeOnComplete: number; removeOnFail: number };
    },
  ): Promise<unknown>;
}

/**
 * Registers the repeating sweep job on the queue. BullMQ keeps one scheduler per
 * id in Redis and adds each run once, so every worker that registers it, and every
 * restart, shares the one schedule and an unchanged interval or threshold is
 * simply refreshed. A sweep is never retried (the next one runs soon), and only
 * a few finished sweeps are kept.
 */
export function scheduleStuckItemSweep(
  queue: SweepScheduler,
  { stuckAfterMs, intervalMs }: StuckItemSweepSettings,
): Promise<unknown> {
  return queue.upsertJobScheduler(
    SWEEP_STUCK_ITEMS_JOB,
    { every: intervalMs },
    {
      name: SWEEP_STUCK_ITEMS_JOB,
      data: { stuckAfterMs },
      opts: { attempts: 1, removeOnComplete: 10, removeOnFail: 10 },
    },
  );
}
