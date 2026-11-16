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
function bothWorkers() {
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
  createItemProcessingWorker(container, { host: "redis" });
  createItemTaggingWorker(container, { host: "redis" });

  return {
    processUseCase,
    failUseCase,
    tagUseCase,
    logger,
    queues: vi.mocked(Worker).mock.calls.map(([queue]) => queue),
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
