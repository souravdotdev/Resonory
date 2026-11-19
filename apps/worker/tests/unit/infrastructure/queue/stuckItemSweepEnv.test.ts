import { describe, expect, it } from "vitest";
import {
  describeStuckItemSweep,
  stuckItemSweepEnv,
} from "@/infrastructure/queue/stuckItemSweepEnv";

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
