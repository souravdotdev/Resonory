import { Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";
import { handleFailedJob, type FailedJob } from "@/interface/onJobFailed";
import { tagItem } from "@/interface/processors/tagItem.processor";
import { tagItemFailed } from "@/interface/processors/tagItemFailed.processor";

/** How many Tag Item jobs run at once: BullMQ's default of one, until tagging is tuned. */
const ITEM_TAGGING_CONCURRENCY = 1;

/**
 * The tagging worker's `failed` handler (`handleFailedJob`). Once no attempt is
 * left, `tagItemFailed` only logs it: the Item stays Ready, just without AI Tags.
 */
function onItemTaggingJobFailed(
  container: Container,
  job: FailedJob | undefined,
  error: Error,
): Promise<void> {
  return handleFailedJob(container, ITEM_TAGGING_QUEUE, job, error, {
    run: (failed) => tagItemFailed(container, failed.data),
    errorMessage: "couldn't log that AI tagging gave up",
  });
}

/**
 * The BullMQ worker that consumes the Item tagging queue, on the given Redis
 * connection. It carries Tag Item jobs only, so there is no job-name switch.
 * Their payload is only ids, so a finished job needs no slimming.
 */
export function createItemTaggingWorker(
  container: Container,
  connection: ConnectionOptions,
): Worker {
  const worker = new Worker(ITEM_TAGGING_QUEUE, (job) => tagItem(container, job.data), {
    connection,
    concurrency: ITEM_TAGGING_CONCURRENCY,
  });
  worker.on("failed", (job, error) => void onItemTaggingJobFailed(container, job, error));
  return worker;
}
