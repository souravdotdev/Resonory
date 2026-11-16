import { describe, expect, it } from "vitest";
import { workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";

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

  it.each(["CONCURRENCY", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW_MS", "LOCK_DURATION_MS"])(
    "rejects %s when it is zero, negative, fractional or not a number, naming the variable",
    (name) => {
      for (const bad of ["0", "-1", "1.5", "abc", "10s", " "]) {
        // A rate limit needs both halves, so the other half is always present.
        const env: Record<string, string> = {
          ITEM_TAGGING_RATE_LIMIT_MAX: "30",
          ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000",
          [`ITEM_TAGGING_${name}`]: bad,
        };
        expect(() => workerLimitsEnv(env, TAGGING), `${name}=${bad}`).toThrow(
          new RegExp(`Invalid environment variables in the worker[\\s\\S]*ITEM_TAGGING_${name}`),
        );
      }
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
});
