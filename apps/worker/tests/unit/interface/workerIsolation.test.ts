import "reflect-metadata";
import { Worker } from "bullmq";
import { Container } from "inversify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ITEM_PROCESSING_QUEUE,
  ITEM_TAGGING_QUEUE,
  PROCESS_ITEM_JOB,
  TAG_ITEM_JOB,
} from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { workerLimitsEnv } from "@/infrastructure/queue/workerLimitsEnv";
import { createItemProcessingWorker } from "@/interface/itemProcessingWorker";
import { createItemTaggingWorker } from "@/interface/itemTaggingWorker";
import { createRecordingLogger } from "../testLogger";

// BullMQ's Worker would connect to Redis; a stand-in records how each factory builds it.
vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();
  return { ...actual, Worker: vi.fn() };
});

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const FINISHED_ON = Date.parse("2026-04-01T00:00:00.000Z");
const GAVE_UP = "AI tagging gave up; the Item stays Ready without AI Tags";

type FailedListener = (job: unknown, error: Error) => void;

// Both worker factories over one container, each use case a stand-in.
function bothWorkers(env: NodeJS.ProcessEnv = {}) {
  const processUseCase = { execute: vi.fn(async () => ({})) };
  const failUseCase = { execute: vi.fn(async () => ({})) };
  const tagUseCase = { execute: vi.fn(async () => ({})) };
  const logger = createRecordingLogger();
  const container = new Container();
  container.bind(WORKER_TOKENS.ProcessItemUseCase).toConstantValue(processUseCase);
  container.bind(WORKER_TOKENS.FailItemUseCase).toConstantValue(failUseCase);
  container.bind(WORKER_TOKENS.TagItemUseCase).toConstantValue(tagUseCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);

  const failedListeners = new Map<string, FailedListener>();
  vi.mocked(Worker).mockImplementation(function (queue: string) {
    return {
      on: (_event: string, listener: FailedListener) => void failedListeners.set(queue, listener),
    };
  } as never);
  createItemProcessingWorker(container, { host: "redis" }, workerLimitsEnv(env, "ITEM_PROCESSING"));
  createItemTaggingWorker(container, { host: "redis" }, workerLimitsEnv(env, "ITEM_TAGGING"));

  return {
    processUseCase,
    failUseCase,
    tagUseCase,
    logger,
    queues: vi.mocked(Worker).mock.calls.map(([queue]) => queue),
    // What each queue's worker was built with.
    optionsOf: (queue: string) => vi.mocked(Worker).mock.calls.find(([name]) => name === queue)![2],
    // One job on the given queue failing for good.
    failForGood: (queue: string, name: string) =>
      failedListeners.get(queue)!(
        {
          id: "42",
          name,
          data: { itemId: ITEM_ID, userId: USER_ID },
          attemptsMade: 3,
          opts: { attempts: 3 },
          finishedOn: FINISHED_ON,
          updateData: vi.fn(async () => {}),
        },
        new Error("boom"),
      ),
  };
}

beforeEach(() => {
  vi.mocked(Worker).mockReset();
});

describe("the two workers", () => {
  it("are tuned independently: ITEM_TAGGING_* settings leave the processing worker as it was", () => {
    const { optionsOf } = bothWorkers({
      ITEM_TAGGING_CONCURRENCY: "4",
      ITEM_TAGGING_RATE_LIMIT_MAX: "30",
      ITEM_TAGGING_RATE_LIMIT_WINDOW_MS: "60000",
      ITEM_TAGGING_LOCK_DURATION_MS: "90000",
    });

    expect(optionsOf(ITEM_PROCESSING_QUEUE)).toEqual({
      connection: { host: "redis" },
      concurrency: 1,
    });
    expect(optionsOf(ITEM_TAGGING_QUEUE)).toMatchObject({
      concurrency: 4,
      limiter: { max: 30, duration: 60000 },
      lockDuration: 90000,
    });
  });

  it("are tuned independently: ITEM_PROCESSING_* settings leave the tagging worker as it was", () => {
    const { optionsOf } = bothWorkers({
      ITEM_PROCESSING_CONCURRENCY: "3",
      ITEM_PROCESSING_RATE_LIMIT_MAX: "10",
      ITEM_PROCESSING_RATE_LIMIT_WINDOW_MS: "1000",
      ITEM_PROCESSING_LOCK_DURATION_MS: "60000",
    });

    expect(optionsOf(ITEM_TAGGING_QUEUE)).toEqual({
      connection: { host: "redis" },
      concurrency: 1,
    });
    expect(optionsOf(ITEM_PROCESSING_QUEUE)).toMatchObject({
      concurrency: 3,
      limiter: { max: 10, duration: 1000 },
      lockDuration: 60000,
    });
  });

  it("each listen on their own queue, and on no other", () => {
    const { queues } = bothWorkers();

    expect(queues).toEqual([ITEM_PROCESSING_QUEUE, ITEM_TAGGING_QUEUE]);
    expect(ITEM_PROCESSING_QUEUE).not.toBe(ITEM_TAGGING_QUEUE);
  });

  it("leave the tagging side alone when a processing job fails for good", async () => {
    const workers = bothWorkers();

    workers.failForGood(ITEM_PROCESSING_QUEUE, PROCESS_ITEM_JOB);
    await vi.waitFor(() => expect(workers.failUseCase.execute).toHaveBeenCalledOnce());

    expect(workers.tagUseCase.execute).not.toHaveBeenCalled();
    expect(workers.logger.logs.map((log) => log.msg)).not.toContain(GAVE_UP);
  });

  it("leave the processing side alone when a tagging job fails for good", async () => {
    const workers = bothWorkers();

    workers.failForGood(ITEM_TAGGING_QUEUE, TAG_ITEM_JOB);
    await vi.waitFor(() => expect(workers.logger.logs.map((log) => log.msg)).toContain(GAVE_UP));

    expect(workers.failUseCase.execute).not.toHaveBeenCalled();
    expect(workers.processUseCase.execute).not.toHaveBeenCalled();
  });
});
