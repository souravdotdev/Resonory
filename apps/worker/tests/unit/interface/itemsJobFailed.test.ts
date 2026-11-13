import "reflect-metadata";
import { UnrecoverableError } from "bullmq";
import { Container } from "inversify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROCESS_ITEM_JOB } from "@resonory/shared/schemas/queue";
import type { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { type FailedItemsJob, onItemsJobFailed } from "@/interface/itemsJobFailed";
import { createRecordingLogger } from "../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

// A test container whose Fail Item use case is a stand-in marking the Item Failed as a Link.
function testContainer() {
  const useCase = {
    execute: vi.fn(async () => ({ outcome: "failed" as const, type: "link" as const })),
  };
  const logger = createRecordingLogger();
  const container = new Container();
  container
    .bind<Pick<FailItemUseCase, "execute">>(WORKER_TOKENS.FailItemUseCase)
    .toConstantValue(useCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  return { container, useCase, logger };
}

// When BullMQ moved a job to the failed set: it sets this only once no attempt is left.
const FINISHED_ON = Date.parse("2026-04-01T00:00:00.000Z");

// A Process Item job after `attemptsMade` failed attempts out of 3. BullMQ
// retries it until the third, unless `finished` says no attempt is left.
function processItemJob(
  attemptsMade: number,
  {
    data = { itemId: ITEM_ID, userId: USER_ID },
    finished = attemptsMade >= 3,
  }: { data?: unknown; finished?: boolean } = {},
) {
  return {
    id: "42",
    name: PROCESS_ITEM_JOB,
    data,
    attemptsMade,
    opts: { attempts: 3 },
    updateData: vi.fn(async (_data: unknown) => {}),
    ...(finished ? { finishedOn: FINISHED_ON } : {}),
  } satisfies FailedItemsJob;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a failed job on the Items queue", () => {
  it("marks the Item Failed after the final attempt", async () => {
    const { container, useCase } = testContainer();

    await onItemsJobFailed(container, processItemJob(3), new Error("Postgres is down"));

    expect(useCase.execute).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("drops the job's captured content and captions once it has failed for good", async () => {
    const { container } = testContainer();
    const data = { itemId: ITEM_ID, userId: USER_ID, html: "<html></html>", captions: "Hi" };
    const job = processItemJob(3, { data });

    await onItemsJobFailed(container, job, new Error("Postgres is down"));

    expect(job.updateData).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("keeps the job's captured content for the attempts still to come", async () => {
    const { container } = testContainer();
    const data = { itemId: ITEM_ID, userId: USER_ID, html: "<html></html>" };
    const job = processItemJob(1, { data });

    await onItemsJobFailed(container, job, new Error("Postgres is down"));

    expect(job.updateData).not.toHaveBeenCalled();
  });

  it.each([1, 2])("leaves the Item Processing after attempt %i of 3", async (attemptsMade) => {
    const { container, useCase } = testContainer();

    await onItemsJobFailed(container, processItemJob(attemptsMade), new Error("Postgres is down"));

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("logs why the job failed, on every attempt, bound to that job's id and name", async () => {
    const { container, logger } = testContainer();

    await onItemsJobFailed(container, processItemJob(1), new Error("Postgres is down"));
    await onItemsJobFailed(container, processItemJob(3), new UnrecoverableError("fetch timed out"));

    // The second call also runs the job's final-failure step (the Fail Item
    // use case stand-in reports "failed"), which logs its own "Item is
    // Failed" line through the shared logger; only the job-failure lines
    // themselves are under test here.
    expect(logger.logs.filter((log) => log.level === "error")).toEqual([
      {
        level: "error",
        bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
        fields: { attemptsMade: 1, attempts: 3, err: "Error", willRetry: true },
        msg: "job failed",
      },
      {
        level: "error",
        bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
        fields: { attemptsMade: 3, attempts: 3, err: "UnrecoverableError", willRetry: false },
        msg: "job failed",
      },
    ]);
  });

  it("marks the Item Failed when BullMQ fails a job that stalled too often", async () => {
    const { container, useCase } = testContainer();

    // BullMQ fails it with an UnrecoverableError on its next pick-up, attempts left or not.
    await onItemsJobFailed(
      container,
      processItemJob(1, { finished: true }),
      new UnrecoverableError("job stalled more than allowable limit"),
    );

    expect(useCase.execute).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("marks the Item Failed whenever BullMQ has no attempt left, whatever the count says", async () => {
    const { container, useCase } = testContainer();

    await onItemsJobFailed(
      container,
      processItemJob(1, { finished: true }),
      new Error("Postgres is down"),
    );

    expect(useCase.execute).toHaveBeenCalledOnce();
  });

  it("leaves the Item Processing while BullMQ will retry the job", async () => {
    const { container, useCase } = testContainer();

    await onItemsJobFailed(
      container,
      processItemJob(3, { finished: false }),
      new Error("Postgres is down"),
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("changes no Item when the job could never succeed (invalid payload)", async () => {
    const { container, useCase, logger } = testContainer();

    await onItemsJobFailed(
      container,
      processItemJob(1, { data: { itemId: "42" }, finished: true }),
      new UnrecoverableError("Invalid Process Item payload"),
    );

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(logger.logs).toEqual([
      {
        level: "error",
        bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
        fields: { attemptsMade: 1, attempts: 3, err: "UnrecoverableError", willRetry: false },
        msg: "job failed",
      },
    ]);
  });

  it("changes no Item for a job with an unknown name", async () => {
    const { container, useCase } = testContainer();

    await onItemsJobFailed(
      container,
      { ...processItemJob(3), name: "send-digest" },
      new Error("boom"),
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("logs, rather than throws, when the Item can't be marked Failed, with no raw error message", async () => {
    const { container, useCase, logger } = testContainer();
    useCase.execute.mockRejectedValueOnce(new Error("Postgres is still down"));

    await expect(
      onItemsJobFailed(container, processItemJob(3), new Error("Postgres is down")),
    ).resolves.toBeUndefined();

    expect(logger.logs).toContainEqual({
      level: "error",
      bindings: { jobId: "42", jobName: PROCESS_ITEM_JOB },
      fields: { err: "Error" },
      msg: "couldn't mark the Item Failed",
    });
    expect(JSON.stringify(logger.logs)).not.toContain("Postgres is still down");
  });

  it("logs a failure BullMQ reports without its job, with no raw error message", async () => {
    const { container, useCase, logger } = testContainer();

    await onItemsJobFailed(
      container,
      undefined,
      new Error("job stalled more than allowable limit"),
    );

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(logger.logs).toEqual([
      {
        level: "error",
        bindings: {},
        fields: { queue: "items", err: "Error" },
        msg: "a job on the queue failed, with no job",
      },
    ]);
  });
});
