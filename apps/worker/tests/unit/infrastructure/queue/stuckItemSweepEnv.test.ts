import { describe, expect, it } from "vitest";
import {
  assertStuckAfterOutlastsLock,
  describeStuckItemSweep,
  stuckItemSweepEnv,
} from "@/infrastructure/queue/stuckItemSweepEnv";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";

const MINUTE = 60_000;

describe("stuckItemSweepEnv", () => {
  it("is 10 minutes before an Item is stuck, swept every 5, when nothing is set", () => {
    expect(stuckItemSweepEnv({})).toEqual({ stuckAfterMs: 10 * MINUTE, intervalMs: 5 * MINUTE });
  });

  it("reads both settings", () => {
    expect(
      stuckItemSweepEnv({
        ITEM_PROCESSING_STUCK_AFTER_MS: "900000",
        ITEM_PROCESSING_SWEEP_INTERVAL_MS: "60000",
      }),
    ).toEqual({ stuckAfterMs: 900000, intervalMs: 60000 });
  });

  it("treats an empty variable as unset", () => {
    expect(
      stuckItemSweepEnv({
        ITEM_PROCESSING_STUCK_AFTER_MS: "",
        ITEM_PROCESSING_SWEEP_INTERVAL_MS: "",
      }),
    ).toEqual({ stuckAfterMs: 10 * MINUTE, intervalMs: 5 * MINUTE });
  });

  describe.each(["ITEM_PROCESSING_STUCK_AFTER_MS", "ITEM_PROCESSING_SWEEP_INTERVAL_MS"])(
    "%s",
    (name) => {
      it.each(["0", "-1", "1.5", "abc", "10s", " "])("refuses %j, naming the variable", (value) => {
        expect(() => stuckItemSweepEnv({ [name]: value })).toThrow(
          new RegExp(`Invalid environment variables in the worker:\\n\\s+- ${name}: must be`),
        );
      });
    },
  );

  it("names every variable that is wrong", () => {
    expect(() =>
      stuckItemSweepEnv({
        ITEM_PROCESSING_STUCK_AFTER_MS: "x",
        ITEM_PROCESSING_SWEEP_INTERVAL_MS: "y",
      }),
    ).toThrow(/ITEM_PROCESSING_STUCK_AFTER_MS[\s\S]*ITEM_PROCESSING_SWEEP_INTERVAL_MS/);
  });
});

describe("describeStuckItemSweep", () => {
  it("is the settings as a boot log field, under the names the sweep uses", () => {
    expect(describeStuckItemSweep({ stuckAfterMs: 600000, intervalMs: 300000 })).toEqual({
      stuckAfterMs: 600000,
      sweepIntervalMs: 300000,
    });
  });
});

// Two backoff waits of a Process Item job's three attempts (5 s, then 10 s).
const BACKOFF_MS = 15_000;

const limitsWith = (lockDuration: number | undefined): WorkerLimits => ({
  concurrency: 1,
  limiter: undefined,
  lockDuration,
});

describe("assertStuckAfterOutlastsLock", () => {
  it("accepts the defaults", () => {
    expect(() =>
      assertStuckAfterOutlastsLock(stuckItemSweepEnv({}), limitsWith(undefined)),
    ).not.toThrow();
  });

  it("accepts a threshold above the lock duration plus the retry backoff", () => {
    expect(() =>
      assertStuckAfterOutlastsLock(
        { stuckAfterMs: 120_000 + BACKOFF_MS + 1, intervalMs: 60_000 },
        limitsWith(120_000),
      ),
    ).not.toThrow();
  });

  it("refuses a threshold equal to the lock duration plus the retry backoff", () => {
    expect(() =>
      assertStuckAfterOutlastsLock(
        { stuckAfterMs: 120_000 + BACKOFF_MS, intervalMs: 60_000 },
        limitsWith(120_000),
      ),
    ).toThrow(/ITEM_PROCESSING_STUCK_AFTER_MS/);
  });

  it("refuses a threshold below the lock duration, naming both variables and the numbers", () => {
    expect(() =>
      assertStuckAfterOutlastsLock(
        { stuckAfterMs: 60_000, intervalMs: 60_000 },
        limitsWith(300_000),
      ),
    ).toThrow(
      /Invalid environment variables in the worker:\n\s+- ITEM_PROCESSING_STUCK_AFTER_MS: .*ITEM_PROCESSING_LOCK_DURATION_MS.*300000.*15000/,
    );
  });

  it("measures against BullMQ's 30 s lock duration when none is set", () => {
    const limits = limitsWith(undefined);

    expect(() =>
      assertStuckAfterOutlastsLock({ stuckAfterMs: 30_000 + BACKOFF_MS, intervalMs: 1 }, limits),
    ).toThrow(/ITEM_PROCESSING_STUCK_AFTER_MS/);
    expect(() =>
      assertStuckAfterOutlastsLock(
        { stuckAfterMs: 30_000 + BACKOFF_MS + 1, intervalMs: 1 },
        limits,
      ),
    ).not.toThrow();
  });
});
