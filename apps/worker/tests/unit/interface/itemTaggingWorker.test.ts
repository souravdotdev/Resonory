import "reflect-metadata";
import { UnrecoverableError, Worker } from "bullmq";
import { Container } from "inversify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ITEM_TAGGING_QUEUE, TAG_ITEM_JOB } from "@resonory/shared/schemas/queue";
import type { TagItemResult } from "@/application/dto/items/TagItemResult";
import type { TagItemUseCase } from "@/application/use-cases/items/TagItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { createItemTaggingWorker } from "@/interface/itemTaggingWorker";
import { createRecordingLogger } from "../testLogger";

// BullMQ's Worker would connect to Redis; a stand-in records how the factory builds it.
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  return { ...actual, Worker: vi.fn() };
});

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const FINISHED_ON = Date.parse("2026-04-01T00:00:00.000Z");

interface TagJob {
  name: string;
  data: unknown;
  updateData?: (data: unknown) => Promise<void>;
}
interface FailedJob extends TagJob {
  id: string;
  attemptsMade: number;
  opts: { attempts: number };
  finishedOn?: number;
}
type FailedListener = (job: FailedJob | undefined, error: Error) => void;

// The tagging worker as the factory builds it, over a Tag Item use case stand-in.
function taggingWorker(
  result: TagItemResult = { outcome: "tagged", suggested: ["a"], applied: ["a"] },
) {
  const useCase = { execute: vi.fn(async () => result) };
  const logger = createRecordingLogger();
  const container = new Container();
  container
    .bind<Pick<TagItemUseCase, "execute">>(WORKER_TOKENS.TagItemUseCase)
    .toConstantValue(useCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);

  const listeners = new Map<string, FailedListener>();
  vi.mocked(Worker).mockImplementation(function () {
    return { on: (event: string, listener: FailedListener) => void listeners.set(event, listener) };
  } as never);
  createItemTaggingWorker(container, { host: "redis" });

  const [queue, processor, options] = vi.mocked(Worker).mock.calls[0]!;
  return {
    useCase,
    logger,
    queue,
    options,
    run: processor as unknown as (job: TagJob) => Promise<void>,
    fail: (job: FailedJob | undefined, error: Error) => listeners.get("failed")!(job, error),
  };
}

const tagJob = (data: unknown = { itemId: ITEM_ID, userId: USER_ID }): TagJob => ({
  name: TAG_ITEM_JOB,
  data,
});

function failedJob(attemptsMade: number, finished: boolean): FailedJob {
  return {
    ...tagJob(),
    id: "42",
    attemptsMade,
    opts: { attempts: 3 },
    ...(finished ? { finishedOn: FINISHED_ON } : {}),
  };
}

beforeEach(() => {
  vi.mocked(Worker).mockReset();
});

describe("the tagging worker", () => {
  it("listens only on the Item tagging queue, over the given Redis connection", () => {
    const worker = taggingWorker();

    expect(worker.queue).toBe(ITEM_TAGGING_QUEUE);
    expect(worker.options).toEqual({ connection: { host: "redis" } });
  });

  it("tags the Item of a valid Tag Item job, scoped to its User", async () => {
    const worker = taggingWorker();

    await worker.run(tagJob());

    expect(worker.useCase.execute).toHaveBeenCalledExactlyOnceWith({
      itemId: ITEM_ID,
      userId: USER_ID,
    });
  });

  it.each([
    ["no payload", undefined],
    ["a missing userId", { itemId: ITEM_ID }],
    ["an itemId that isn't a UUID", { itemId: "42", userId: USER_ID }],
  ])("fails a job with %s without retrying it", async (_case, data) => {
    const worker = taggingWorker();

    await expect(worker.run({ name: TAG_ITEM_JOB, data })).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(worker.useCase.execute).not.toHaveBeenCalled();
  });

  it("lets a tagging error through, so the job is retried", async () => {
    const worker = taggingWorker();
    worker.useCase.execute.mockRejectedValueOnce(new Error("429 Rate limit reached"));

    const run = worker.run(tagJob());

    await expect(run).rejects.toThrow("429 Rate limit reached");
    await expect(run).rejects.not.toBeInstanceOf(UnrecoverableError);
  });

  it("keeps a finished job's payload as it is: it is only ids", async () => {
    const worker = taggingWorker();
    const updateData = vi.fn(async () => {});

    await worker.run({ ...tagJob(), updateData });

    expect(updateData).not.toHaveBeenCalled();
  });

  it("logs every failed attempt, and nothing more, while BullMQ will retry the job", async () => {
    const worker = taggingWorker();

    worker.fail(failedJob(1, false), new Error("429 Rate limit reached"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.logger.logs).toEqual([
      {
        level: "error",
        bindings: { jobId: "42", jobName: TAG_ITEM_JOB },
        fields: { attemptsMade: 1, attempts: 3, err: "Error", willRetry: true },
        msg: "job failed",
      },
    ]);
  });

  it("only logs, with the Item's id, once the job has failed for good: the Item stays Ready", async () => {
    const worker = taggingWorker();

    worker.fail(failedJob(3, true), new Error("429 Rate limit reached"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(2));

    expect(worker.logger.logs[1]).toEqual({
      level: "warn",
      bindings: { itemId: ITEM_ID },
      fields: {},
      msg: "AI tagging gave up; the Item stays Ready without AI Tags",
    });
    expect(worker.useCase.execute).not.toHaveBeenCalled();
  });

  it("logs, rather than throws, when its final-failure log can't be written", async () => {
    const worker = taggingWorker();
    const child = worker.logger.child.bind(worker.logger);
    vi.spyOn(worker.logger, "child").mockImplementation(((bindings: Record<string, unknown>) => {
      if ("itemId" in bindings) throw new Error("logger is gone");
      return child(bindings);
    }) as typeof worker.logger.child);

    worker.fail(failedJob(3, true), new Error("429 Rate limit reached"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(2));

    expect(worker.logger.logs[1]).toEqual({
      level: "error",
      bindings: { jobId: "42", jobName: TAG_ITEM_JOB },
      fields: { err: "Error" },
      msg: "couldn't log that AI tagging gave up",
    });
  });

  it("logs a failure BullMQ reports without its job", async () => {
    const worker = taggingWorker();

    worker.fail(undefined, new Error("job stalled more than allowable limit"));
    await vi.waitFor(() => expect(worker.logger.logs).toHaveLength(1));

    expect(worker.logger.logs[0]).toEqual({
      level: "error",
      bindings: {},
      fields: { queue: ITEM_TAGGING_QUEUE, err: "Error" },
      msg: "a job on the queue failed, with no job",
    });
  });
});
