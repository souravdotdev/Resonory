import "reflect-metadata";
import { UnrecoverableError } from "bullmq";
import { Container } from "inversify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROCESS_ITEM_JOB } from "@resonory/shared/schemas/queue";
import type { ProcessItemResult } from "@/application/dto/items/ProcessItemResult";
import type { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { NO_METADATA } from "@/domain/entities/Item";
import { runItemsJob } from "@/interface/itemsWorker";
import { createRecordingLogger, type RecordingLogger } from "../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

// A test container whose Process Item use case is a stand-in reporting `result`.
function testContainer(
  result: ProcessItemResult = {
    outcome: "ready",
    type: "video",
    metadata: NO_METADATA,
    thumbnailKey: null,
    text: null,
  },
) {
  const useCase = { execute: vi.fn(async () => result) };
  const container = new Container();
  container
    .bind<Pick<ProcessItemUseCase, "execute">>(WORKER_TOKENS.ProcessItemUseCase)
    .toConstantValue(useCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(createRecordingLogger());
  return { container, useCase };
}

// A job on the Items queue, as the worker hands it over, whose data rewrites are recorded.
function itemsJob(name: string, data: unknown) {
  return { name, data, updateData: vi.fn(async (_data: unknown) => {}) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the Items queue's job switch", () => {
  it("runs a Process Item job's Processing with its Item and User", async () => {
    const { container, useCase } = testContainer();

    await runItemsJob(container, itemsJob(PROCESS_ITEM_JOB, { itemId: ITEM_ID, userId: USER_ID }));

    expect(useCase.execute).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("drops keys a Process Item payload doesn't have", async () => {
    const { container, useCase } = testContainer();

    await runItemsJob(
      container,
      itemsJob(PROCESS_ITEM_JOB, { itemId: ITEM_ID, userId: USER_ID, extra: true }),
    );

    expect(useCase.execute).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it.each([
    ["no payload", undefined],
    ["a missing userId", { itemId: ITEM_ID }],
    ["an itemId that isn't a UUID", { itemId: "42", userId: USER_ID }],
  ])("fails a Process Item job with %s without retrying it", async (_case, data) => {
    const { container, useCase } = testContainer();

    await expect(runItemsJob(container, itemsJob(PROCESS_ITEM_JOB, data))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("fails a job with an unknown name without retrying it", async () => {
    const { container, useCase } = testContainer();

    await expect(
      runItemsJob(container, itemsJob("send-digest", { itemId: ITEM_ID, userId: USER_ID })),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("drops a finished Process Item job's captured content and captions, keeping its ids", async () => {
    const { container } = testContainer();
    const job = itemsJob(PROCESS_ITEM_JOB, {
      itemId: ITEM_ID,
      userId: USER_ID,
      html: "<html>megabytes</html>",
      captions: "Never gonna give you up",
    });

    await runItemsJob(container, job);

    expect(job.updateData).toHaveBeenCalledWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("leaves a finished Process Item job without captured content as it is", async () => {
    const { container } = testContainer();
    const job = itemsJob(PROCESS_ITEM_JOB, { itemId: ITEM_ID, userId: USER_ID });

    await runItemsJob(container, job);

    expect(job.updateData).not.toHaveBeenCalled();
  });

  it("keeps a job's captured content while it can still be retried", async () => {
    const { container, useCase } = testContainer();
    useCase.execute.mockRejectedValueOnce(new Error("Postgres is down"));
    const job = itemsJob(PROCESS_ITEM_JOB, {
      itemId: ITEM_ID,
      userId: USER_ID,
      html: "<html></html>",
    });

    await expect(runItemsJob(container, job)).rejects.toThrow("Postgres is down");
    expect(job.updateData).not.toHaveBeenCalled();
  });

  it("still succeeds, and warns, when the finished job's data can't be rewritten", async () => {
    const { container } = testContainer();
    const job = itemsJob(PROCESS_ITEM_JOB, {
      itemId: ITEM_ID,
      userId: USER_ID,
      html: "<html></html>",
    });
    job.updateData.mockRejectedValueOnce(new Error("Redis is down"));

    await expect(runItemsJob(container, job)).resolves.toBeUndefined();
    expect(container.get<RecordingLogger>(WORKER_TOKENS.Logger).logs).toContainEqual({
      level: "warn",
      bindings: {},
      fields: { jobName: PROCESS_ITEM_JOB, err: "Error" },
      msg: "couldn't slim a finished job's data",
    });
  });

  it("lets a Processing error through, so the job is retried", async () => {
    const { container, useCase } = testContainer();
    useCase.execute.mockRejectedValueOnce(new Error("Postgres is down"));

    const run = runItemsJob(
      container,
      itemsJob(PROCESS_ITEM_JOB, { itemId: ITEM_ID, userId: USER_ID }),
    );

    await expect(run).rejects.toThrow("Postgres is down");
    await expect(run).rejects.not.toBeInstanceOf(UnrecoverableError);
  });
});
