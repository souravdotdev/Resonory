import type { JobsOptions } from "bullmq";
import { inject, injectable } from "inversify";
import { TAG_ITEM_JOB, TagItemJobSchema, type TagItemJob } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import type { IQueueProvider, TagItemRequest } from "@/domain/providers/IQueueProvider";

/**
 * The part of a BullMQ `Queue` the worker uses: this provider adds to it, and
 * shutdown (`src/index.ts`) closes it. The container binds the production
 * `itemsQueue` to it, which checks the real queue fits.
 */
export interface ItemsQueue {
  add(name: string, data: TagItemJob, opts: JobsOptions): Promise<unknown>;
  close(): Promise<void>;
}

// A failing model is retried twice more, 30 s then 60 s later: long enough for a
// free tier's per-minute rate limit to reset. Finished jobs are trimmed like
// Process Item jobs (docs/queue.md).
const TAG_ITEM_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

/** Enqueues the worker's own follow-up work as BullMQ jobs on the Items queue. */
@injectable()
export class BullMqQueueProvider implements IQueueProvider {
  constructor(@inject(WORKER_TOKENS.ItemsQueue) private readonly queue: ItemsQueue) {}

  async enqueueTagItem(request: TagItemRequest): Promise<void> {
    // Parsed here, so a payload the Tag Item processor would refuse never reaches Redis.
    const payload: TagItemJob = TagItemJobSchema.parse({
      itemId: request.itemId,
      userId: request.userId,
    });
    await this.queue.add(TAG_ITEM_JOB, payload, TAG_ITEM_OPTIONS);
  }
}
