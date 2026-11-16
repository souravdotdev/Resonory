import type { JobsOptions } from "bullmq";
import { inject, injectable } from "inversify";
import { TAG_ITEM_JOB, TagItemJobSchema, type TagItemJob } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import type { IQueueProvider, TagItemRequest } from "@/domain/providers/IQueueProvider";

/**
 * The part of the BullMQ Item tagging `Queue` the processing worker uses: the
 * provider adds Tag Item jobs to it, and the worker's shutdown
 * (`src/itemProcessing.ts`) closes it. The processing container binds the
 * production `itemTaggingQueue` to it, which checks the real queue fits.
 */
export interface ItemTaggingQueue {
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

/** Enqueues the worker's own follow-up work as BullMQ jobs on the Item tagging queue. */
@injectable()
export class BullMqQueueProvider implements IQueueProvider {
  constructor(@inject(WORKER_TOKENS.ItemTaggingQueue) private readonly queue: ItemTaggingQueue) {}

  async enqueueTagItem(request: TagItemRequest): Promise<void> {
    // Parsed here, so a payload the Tag Item processor would refuse never reaches Redis.
    const payload: TagItemJob = TagItemJobSchema.parse({
      itemId: request.itemId,
      userId: request.userId,
    });
    await this.queue.add(TAG_ITEM_JOB, payload, TAG_ITEM_OPTIONS);
  }
}
