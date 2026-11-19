import { describe, expect, it } from "vitest";
import { describeWorkerLimits, workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";

const TAGGING = "ITEM_TAGGING";
const PROCESSING = "ITEM_PROCESSING";

describe("workerLimitsEnv", () => {
  it("gives today's behaviour when nothing is set: one job at a time, no limiter, BullMQ's lock duration", () => {
    expect(workerLimitsEnv({}, TAGGING)).toEqual({
      concurrency: 1,
      limiter: undefined,
      lockDuration: undefined,
    });
  });

  it("reads the concurrency", () => {
    expect(workerLimitsEnv({ ITEM_TAGGING_CONCURRENCY: "4" }, TAGGING).concurrency).toBe(4);
  });

  it("reads a rate limit of a maximum and a window", () => {
    expect(
      workerLimitsEnv(
        { ITEM_TAGGING_RATE_LIMIT_MAX: "30", ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000" },
        TAGGING,
      ).limiter,
    ).toEqual({ max: 30, duration: 60000 });
  });

  it("reads the lock duration", () => {
    expect(workerLimitsEnv({ ITEM_TAGGING_LOCK_DURATION_MS: "120000" }, TAGGING).lockDuration).toBe(
      120000,
    );
  });

  it("treats an empty variable as unset", () => {
    expect(
      workerLimitsEnv(
        {
          ITEM_TAGGING_CONCURRENCY: "",
          ITEM_TAGGING_RATE_LIMIT_MAX: "",
          ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "",
          ITEM_TAGGING_LOCK_DURATION_MS: "",
        },
        TAGGING,
      ),
    ).toEqual({ concurrency: 1, limiter: undefined, lockDuration: undefined });
  });

  const NAMES = ["CONCURRENCY", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW_MS", "LOCK_DURATION_MS"];
  const BAD_VALUES = ["0", "-1", "1.5", "abc", "10s", " "];
  const badSettings = NAMES.flatMap((name) => BAD_VALUES.map((bad) => [name, bad] as const));

  it.each(badSettings)(
    "rejects %s=%j (not a positive whole number), naming the variable",
    (name, bad) => {
      // A rate limit needs both halves, so the other half is always present.
      const env: Record<string, string> = {
        ITEM_TAGGING_RATE_LIMIT_MAX: "30",
        ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000",
        [`ITEM_TAGGING_${name}`]: bad,
      };
      expect(() => workerLimitsEnv(env, TAGGING)).toThrow(
        new RegExp(`Invalid environment variables in the worker[\\s\\S]*ITEM_TAGGING_${name}`),
      );
    },
  );

  it("rejects a rate limit with only a maximum, naming the missing window", () => {
    expect(() => workerLimitsEnv({ ITEM_TAGGING_RATE_LIMIT_MAX: "30" }, TAGGING)).toThrow(
      "ITEM_TAGGING_RATE_LIMIT_WINDOW_MS",
    );
  });

  it("rejects a rate limit with only a window, naming the missing maximum", () => {
    expect(() => workerLimitsEnv({ ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000" }, TAGGING)).toThrow(
      "ITEM_TAGGING_RATE_LIMIT_MAX",
    );
  });

  it("works for any queue prefix, and the two prefixes never read each other's variables", () => {
    const env = {
      ITEM_PROCESSING_CONCURRENCY: "3",
      ITEM_PROCESSING_LOCK_DURATION_MS: "90000",
      ITEM_TAGGING_CONCURRENCY: "8",
      ITEM_TAGGING_RATE_LIMIT_MAX: "30",
      ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000",
    };

    expect(workerLimitsEnv(env, PROCESSING)).toEqual({
      concurrency: 3,
      limiter: undefined,
      lockDuration: 90000,
    });
    expect(workerLimitsEnv(env, TAGGING)).toEqual({
      concurrency: 8,
      limiter: { max: 30, duration: 60000 },
      lockDuration: undefined,
    });
  });

  it("ignores another prefix's invalid values", () => {
    expect(workerLimitsEnv({ ITEM_PROCESSING_CONCURRENCY: "0" }, TAGGING).concurrency).toBe(1);
  });

  describe("describeWorkerLimits", () => {
    it("says so when nothing beyond the concurrency is set", () => {
      expect(
        describeWorkerLimits({ concurrency: 1, limiter: undefined, lockDuration: undefined }),
      ).toEqual({ concurrency: 1, limiter: "none", lockDuration: "BullMQ default" });
    });

    it("lists every setting that is set, under the names WorkerLimits uses", () => {
      expect(
        describeWorkerLimits({
          concurrency: 4,
          limiter: { max: 30, duration: 60000 },
          lockDuration: 120000,
        }),
      ).toEqual({
        concurrency: 4,
        limiter: { max: 30, duration: 60000 },
        lockDuration: 120000,
      });
    });
  });
});
