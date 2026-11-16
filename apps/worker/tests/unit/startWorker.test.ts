import type { Redis } from "ioredis";
import type { Worker } from "bullmq";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startWorker } from "@/startWorker";
import { createRecordingLogger } from "./testLogger";

afterEach(() => {
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");
  vi.restoreAllMocks();
});

function setup() {
  const calls: string[] = [];
  const redis = {
    ping: vi.fn(async () => void calls.push("ping")),
    quit: vi.fn(async () => void calls.push("redis")),
  };
  const worker = { close: vi.fn(async () => void calls.push("worker")) };
  const extra = { close: vi.fn(async () => void calls.push("extra")) };
  const logger = createRecordingLogger();
  const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  const createWorker = vi.fn(() => {
    calls.push("create");
    return worker as unknown as Worker;
  });
  return { calls, redis, worker, extra, logger, exit, createWorker };
}

describe("startWorker", () => {
  it("pings Redis before it creates the worker, then logs the queue it consumes", async () => {
    const s = setup();

    await startWorker({
      logger: s.logger as never,
      redis: s.redis as unknown as Redis,
      queue: "some-queue",
      createWorker: s.createWorker,
    });

    expect(s.calls).toEqual(["ping", "create"]);
    expect(s.logger.logs).toEqual([
      {
        level: "info",
        bindings: {},
        fields: { queue: "some-queue" },
        msg: "connected; consuming the queue",
      },
    ]);
  });

  it("on SIGTERM closes the worker, then the extra resources, then Redis, and exits", async () => {
    const s = setup();
    await startWorker({
      logger: s.logger as never,
      redis: s.redis as unknown as Redis,
      queue: "some-queue",
      createWorker: s.createWorker,
      alsoClose: [s.extra],
    });

    process.emit("SIGTERM");
    await vi.waitFor(() => expect(s.exit).toHaveBeenCalledWith(0));

    expect(s.calls).toEqual(["ping", "create", "worker", "extra", "redis"]);
  });
});
