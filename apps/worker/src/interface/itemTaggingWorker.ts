import { Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";
import { handleFailedJob, type FailedJob } from "@/interface/onJobFailed";
import { workerOptions } from "@/interface/workerOptions";
import { tagItem } from "@/interface/processors/tagItem.processor";
import { tagItemFailed } from "@/interface/processors/tagItemFailed.processor";

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
 * The BullMQ worker that consumes the Item tagging queue (options: `workerOptions`).
 * It carries Tag Item jobs only, so there is no job-name switch.
 * Their payload is only ids, so a finished job needs no slimming.
 */
export function createItemTaggingWorker(
  container: Container,
  connection: ConnectionOptions,
  limits: WorkerLimits,
): Worker {
  const worker = new Worker(
    ITEM_TAGGING_QUEUE,
    (job) => tagItem(container, job.data),
    workerOptions(connection, limits),
  );
  worker.on("failed", (job, error) => void onItemTaggingJobFailed(container, job, error));
  return worker;
}
