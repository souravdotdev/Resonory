import { describe, expect, it, vi } from "vitest";
import {
  SWEEP_STUCK_ITEMS_JOB,
  scheduleStuckItemSweep,
} from "@/infrastructure/queue/stuckItemSweepSchedule";

const SETTINGS = { stuckAfterMs: 600_000, intervalMs: 300_000 };

interface Template {
  name: string;
  data: { stuckAfterMs: number };
  opts: { attempts: number; removeOnComplete: number; removeOnFail: number };
}

// A queue recording each scheduler it's asked to upsert.
const queueRecording = () => ({
  upsertJobScheduler: vi.fn(
    async (_id: string, _repeat: { every: number }, _template: Template) => ({}),
  ),
});

describe("scheduleStuckItemSweep", () => {
  it("registers one repeating sweep job, every interval, carrying the stuck threshold", async () => {
    const queue = queueRecording();

    await scheduleStuckItemSweep(queue, SETTINGS);

    expect(queue.upsertJobScheduler).toHaveBeenCalledOnce();
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      SWEEP_STUCK_ITEMS_JOB,
      { every: 300_000 },
      expect.objectContaining({ name: SWEEP_STUCK_ITEMS_JOB, data: { stuckAfterMs: 600_000 } }),
    );
  });

  it("runs each sweep once, never retried, and keeps little history of finished sweeps", async () => {
    const queue = queueRecording();

    await scheduleStuckItemSweep(queue, SETTINGS);

    const [, , template] = queue.upsertJobScheduler.mock.calls[0]!;
    expect(template.opts).toEqual({ attempts: 1, removeOnComplete: 10, removeOnFail: 10 });
  });

  it("uses the same scheduler id every time, so a restart or another worker updates it rather than adding one", async () => {
    const queue = queueRecording();

    await scheduleStuckItemSweep(queue, SETTINGS);
    await scheduleStuckItemSweep(queue, { ...SETTINGS, intervalMs: 60_000 });

    const ids = queue.upsertJobScheduler.mock.calls.map(([id]) => id);
    expect(new Set(ids).size).toBe(1);
  });
});
