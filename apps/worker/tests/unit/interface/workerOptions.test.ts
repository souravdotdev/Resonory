import { describe, expect, it } from "vitest";
import { workerOptions } from "@/interface/workerOptions";
import { NO_LIMITS } from "../../support/noLimits";

const connection = { host: "redis" };

describe("workerOptions", () => {
  it("carries the connection and concurrency, and no limiter or lock duration when unset", () => {
    const options = workerOptions(connection, { ...NO_LIMITS, concurrency: 3 });

    expect(options).toEqual({ connection, concurrency: 3 });
    expect(options).not.toHaveProperty("limiter");
    expect(options).not.toHaveProperty("lockDuration");
  });

  it("adds the limiter when there is one", () => {
    expect(
      workerOptions(connection, { ...NO_LIMITS, limiter: { max: 30, duration: 60000 } }),
    ).toMatchObject({ limiter: { max: 30, duration: 60000 } });
  });

  it("adds the lock duration when there is one", () => {
    expect(workerOptions(connection, { ...NO_LIMITS, lockDuration: 120000 })).toMatchObject({
      lockDuration: 120000,
    });
  });
});
