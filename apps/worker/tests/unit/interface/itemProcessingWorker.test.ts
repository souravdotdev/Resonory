import "reflect-metadata";
import { UnrecoverableError, Worker } from "bullmq";
import { Container } from "inversify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ITEM_PROCESSING_QUEUE, PROCESS_ITEM_JOB } from "@resonory/shared/schemas/queue";
import type { ProcessItemResult } from "@/application/dto/items/ProcessItemResult";
import type { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import type { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { NO_METADATA } from "@/domain/entities/Item";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";
import { createItemProcessingWorker } from "@/interface/itemProcessingWorker";
import { NO_LIMITS } from "../../support/noLimits";
import { createRecordingLogger } from "../testLogger";

// BullMQ's Worker would connect to Redis; a stand-in records how the factory builds it.
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  return { ...actual, Worker: vi.fn() };
});

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
// When BullMQ moved a job to the failed set: it sets this only once no attempt is left.
const FINISHED_ON = Date.parse("2026-04-01T00:00:00.000Z");

interface ProcessJob {
  name: string;
  data: unknown;
  updateData: (data: unknown) => Promise<void>;
}
interface FailedJob extends ProcessJob {
  id: string;
  attemptsMade: number;
  opts: { attempts: number };
  finishedOn?: number;
}
type FailedListener = (job: FailedJob | undefined, error: Error) => void;

// The processing worker as the factory builds it, over Process Item and Fail Item use case stand-ins.
function processingWorker(
  result: ProcessItemResult = {
    outcome: "ready",
    type: "video",
    metadata: NO_METADATA,
    thumbnailKey: null,
    text: null,
  },
  limits: WorkerLimits = NO_LIMITS,
) {
  const processUseCase = { execute: vi.fn(async () => result) };
  const failUseCase = {
    execute: vi.fn(async () => ({ outcome: "failed" as const, type: "link" as const })),
  };
  const logger = createRecordingLogger();
  const container = new Container();
  container
    .bind<Pick<ProcessItemUseCase, "execute">>(WORKER_TOKENS.ProcessItemUseCase)
    .toConstantValue(processUseCase);
  container
    .bind<Pick<FailItemUseCase, "execute">>(WORKER_TOKENS.FailItemUseCase)
    .toConstantValue(failUseCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);

  const listeners = new Map<string, FailedListener>();
  vi.mocked(Worker).mockImplementation(function () {
    return { on: (event: string, listener: FailedListener) => void listeners.set(event, listener) };
  } as never);
  createItemProcessingWorker(container, { host: "redis" }, limits);

  const [queue, processor, options] = vi.mocked(Worker).mock.calls[0]!;
  return {
    processUseCase,
    failUseCase,
    logger,
    queue,
    options,
    run: processor as unknown as (job: ProcessJob) => Promise<void>,
    fail: (job: FailedJob | undefined, error: Error) => listeners.get("failed")!(job, error),
  };
}

// A Process Item job as the worker hands it over, whose data rewrites are recorded.
const processJob = (data: unknown = { itemId: ITEM_ID, userId: USER_ID }): ProcessJob => ({
  name: PROCESS_ITEM_JOB,
  data,
  updateData: vi.fn(async (_data: unknown) => {}),
});

// A Process Item job after `attemptsMade` failed attempts out of 3, with no attempt left if `finished`.
function failedJob(
  attemptsMade: number,
  { finished = attemptsMade >= 3, data }: { finished?: boolean; data?: unknown } = {},
): FailedJob {
  return {
    ...processJob(data),
    id: "42",
    attemptsMade,
    opts: { attempts: 3 },
    ...(finished ? { finishedOn: FINISHED_ON } : {}),
  };
}

beforeEach(() => {
  vi.mocked(Worker).mockReset();
});

describe("the processing worker", () => {
  it("listens only on the Item processing queue, over the given Redis connection", () => {
    const worker = processingWorker();

    expect(worker.queue).toBe(ITEM_PROCESSING_QUEUE);
  });

  it("runs one job at a time, with no limiter and BullMQ's lock duration, when nothing is tuned", () => {
    const worker = processingWorker();

    expect(worker.options).toEqual({ connection: { host: "redis" }, concurrency: 1 });
    expect(worker.options).not.toHaveProperty("limiter");
    expect(worker.options).not.toHaveProperty("lockDuration");
  });

  it("runs as many jobs at once as its concurrency says", () => {
    const worker = processingWorker(undefined, { ...NO_LIMITS, concurrency: 5 });

    expect(worker.options).toMatchObject({ concurrency: 5 });
  });

  it("starts at most max jobs per window when it has a rate limit", () => {
    const worker = processingWorker(undefined, {
      ...NO_LIMITS,
      limiter: { max: 10, duration: 1000 },
    });

    expect(worker.options).toMatchObject({ limiter: { max: 10, duration: 1000 } });
  });

  it("holds a job's lock for its lock duration", () => {
    const worker = processingWorker(undefined, { ...NO_LIMITS, lockDuration: 120000 });

    expect(worker.options).toMatchObject({ lockDuration: 120000 });
  });

  it("runs a valid Process Item job's Processing with its Item and User", async () => {
    const worker = processingWorker();

    await worker.run(processJob());

    expect(worker.processUseCase.execute).toHaveBeenCalledExactlyOnceWith({
      itemId: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("drops keys a Process Item payload doesn't have", async () => {
    const worker = processingWorker();

    await worker.run(processJob({ itemId: ITEM_ID, userId: USER_ID, extra: true }));

    expect(worker.processUseCase.execute).toHaveBeenCalledWith({
      itemId: ITEM_ID,
      userId: USER_ID,
    });
  });

  it.each([
    ["no payload", undefined],
    ["a missing userId", { itemId: ITEM_ID }],
    ["an itemId that isn't a UUID", { itemId: "42", userId: USER_ID }],
  ])("fails a job with %s without retrying it", async (_case, data) => {
    const worker = processingWorker();

    await expect(worker.run({ ...processJob(), data })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(worker.processUseCase.execute).not.toHaveBeenCalled();
  });

  it("lets a Processing error through, so the job is retried", async () => {
    const worker = processingWorker();
    worker.processUseCase.execute.mockRejectedValueOnce(new Error("Postgres is down"));

    const run = worker.run(processJob());

    await expect(run).rejects.toThrow("Postgres is down");
    await expect(run).rejects.not.toBeInstanceOf(UnrecoverableError);
  });

  it("drops a finished job's captured content and captions, keeping its ids", async () => {
    const worker = processingWorker();
    const job = processJob({
      itemId: ITEM_ID,
      userId: USER_ID,
      html: "<html>megabytes</html>",
      captions: "Never gonna give you up",
    });

    await worker.run(job);

    expect(job.updateData).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("leaves a finished job without captured content as it is", async () => {
    const worker = processingWorker();
    const job = processJob();

    await worker.run(job);

    expect(job.updateData).not.toHaveBeenCalled();
  });

  it("keeps a job's captured content while it can still be retried", async () => {
    const worker = processingWorker();
    worker.processUseCase.execute.mockRejectedValueOnce(new Error("Postgres is down"));
    const job = processJob({ itemId: ITEM_ID, userId: USER_ID, html: "<html></html>" });

    await expect(worker.run(job)).rejects.toThrow("Postgres is down");
    expect(job.updateData).not.toHaveBeenCalled();
  });

  it("still succeeds, and warns, when the finished job's data can't be rewritten", async () => {
    const worker = processingWorker();
    const job = processJob({ itemId: ITEM_ID, userId: USER_ID, html: "<html></html>" });
    vi.mocked(job.updateData).mockRejectedValueOnce(new Error("Redis is down"));

    await expect(worker.run(job)).resolves.toBeUndefined();
    expect(worker.logger.logs).toContainEqual({
      level: "warn",
      bindings: {},
      fields: { jobName: PROCESS_ITEM_JOB, err: "Error" },
      msg: "couldn't slim a finished job's data",
    });
  });

  it("marks the Item Failed after the final attempt", async () => {
    const worker = processingWorker();

    worker.fail(failedJob(3), new Error("Postgres is down"));

    await vi.waitFor(() =>
      expect(worker.failUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        itemId: ITEM_ID,
        userId: USER_ID,
      }),
    );
  });

  it("marks the Item Failed whenever BullMQ has no attempt left, whatever the count says", async () => {
    const worker = processingWorker();

    // A job that stalled too often: BullMQ fails it for good with attempts to spare.
    worker.fail(
      failedJob(1, { finished: true }),
      new UnrecoverableError("job stalled more than allowable limit"),
    );

    await vi.waitFor(() => expect(worker.failUseCase.execute).toHaveBeenCalledOnce());
  });

  it.each([1, 2])("leaves the Item Processing after attempt %i of 3", async (attemptsMade) => {
    const worker = processingWorker();

    worker.fail(failedJob(attemptsMade), new Error("Postgres is down"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.failUseCase.execute).not.toHaveBeenCalled();
  });

  it("drops the job's captured content and captions once it has failed for good", async () => {
    const worker = processingWorker();
    const job = failedJob(3, {
      data: { itemId: ITEM_ID, userId: USER_ID, html: "<html></html>", captions: "Hi" },
    });

    worker.fail(job, new Error("Postgres is down"));

    await vi.waitFor(() =>
      expect(job.updateData).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID }),
    );
  });

  it("keeps the job's captured content for the attempts still to come", async () => {
    const worker = processingWorker();
    const job = failedJob(1, { data: { itemId: ITEM_ID, userId: USER_ID, html: "<html></html>" } });

    worker.fail(job, new Error("Postgres is down"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(job.updateData).not.toHaveBeenCalled();
  });

  it("logs why the job failed, on every attempt, bound to that job's id and name", async () => {
    const worker = processingWorker();

    worker.fail(failedJob(1), new Error("Postgres is down"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.logger.logs).toEqual([
      {
        level: "error",
        bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
        fields: { attemptsMade: 1, attempts: 3, err: "Error", willRetry: true },
        msg: "job failed",
      },
    ]);
  });

  it("changes no Item when the job could never succeed (invalid payload)", async () => {
    const worker = processingWorker();

    worker.fail(
      failedJob(1, { finished: true, data: { itemId: "42" } }),
      new UnrecoverableError("Invalid Process Item payload"),
    );
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.failUseCase.execute).not.toHaveBeenCalled();
  });

  it("logs, rather than throws, when the Item can't be marked Failed, with no raw error message", async () => {
    const worker = processingWorker();
    worker.failUseCase.execute.mockRejectedValueOnce(new Error("Postgres is still down"));

    worker.fail(failedJob(3), new Error("Postgres is down"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(2));

    expect(worker.logger.logs[1]).toEqual({
      level: "error",
      bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
      fields: { err: "Error" },
      msg: "couldn't mark the Item Failed",
    });
    expect(JSON.stringify(worker.logger.logs)).not.toContain("Postgres is still down");
  });

  it("logs a failure BullMQ reports without its job, with no raw error message", async () => {
    const worker = processingWorker();

    worker.fail(undefined, new Error("job stalled more than allowable limit"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.failUseCase.execute).not.toHaveBeenCalled();
    expect(worker.logger.logs).toEqual([
      {
        level: "error",
        bindings: {},
        fields: { queue: ITEM_PROCESSING_QUEUE, err: "Error" },
        msg: "a job on the queue failed, with no job",
      },
    ]);
  });
});
