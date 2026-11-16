import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { TAG_ITEM_JOB } from "@resonory/shared/schemas/queue";
import {
  BullMqQueueProvider,
  type ItemTaggingQueue,
} from "@/infrastructure/queue/BullMqQueueProvider";

const job = {
  itemId: "3b241101-e2bb-4255-8caf-4136c566a962",
  userId: "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
};

const queueRecording = () =>
  ({ add: vi.fn(async () => ({})), close: vi.fn(async () => {}) }) satisfies ItemTaggingQueue;

describe("the worker's BullMqQueueProvider", () => {
  it("adds a Tag Item job with the Item's and User's ids", async () => {
    const queue = queueRecording();

    await new BullMqQueueProvider(queue).enqueueTagItem(job);

    expect(queue.add).toHaveBeenCalledExactlyOnceWith(TAG_ITEM_JOB, job, expect.anything());
  });

  it("retries 3 times with exponential backoff from 30 s, keeping the last 1000 done and 5000 failed jobs", async () => {
    const queue = queueRecording();

    await new BullMqQueueProvider(queue).enqueueTagItem(job);

    expect(queue.add).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  });

  it("refuses a payload the worker couldn't read, without adding it", async () => {
    const queue = queueRecording();

    await expect(
      new BullMqQueueProvider(queue).enqueueTagItem({ ...job, itemId: "item-1" }),
    ).rejects.toThrow();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
