import { Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";
import { handleFailedJob, type FailedJob } from "@/interface/onJobFailed";
import { workerOptions } from "@/interface/workerOptions";
import { processItem, slimProcessItemData } from "@/interface/processors/processItem.processor";
import { processItemFailed } from "@/interface/processors/processItemFailed.processor";

/** What the processing worker reads from a BullMQ job, and how it rewrites the job's data. */
interface ProcessItemJob {
  name: string;
  data: unknown;
  updateData(data: unknown): Promise<void>;
}

/**
 * Once a job is finished (done, or failed with no attempt left), rewrites its
 * data without the captured content and captions, which BullMQ would otherwise
 * keep in Redis (docs/queue.md). Never throws: the job's outcome stands either
 * way, so a Redis error here is only logged.
 */
async function slimFinishedJob(container: Container, job: ProcessItemJob): Promise<void> {
  const slimmed = slimProcessItemData(job.data);
  if (slimmed === undefined) return;
  try {
    await job.updateData(slimmed);
  } catch (error) {
    container
      .get<Logger>(WORKER_TOKENS.Logger)
      .warn(
        { jobName: job.name, err: describeError(error) },
        "couldn't slim a finished job's data",
      );
  }
}

/**
 * The processing worker's `failed` handler (`handleFailedJob`). Once no attempt
 * is left, the job's Item becomes Failed, and then the job keeps only the data
 * worth keeping (`slimFinishedJob`). A payload that names no Item changes no Item.
 */
function onItemProcessingJobFailed(
  container: Container,
  job: (FailedJob & ProcessItemJob) | undefined,
  error: Error,
): Promise<void> {
  return handleFailedJob(container, ITEM_PROCESSING_QUEUE, job, error, {
    run: (failed) => processItemFailed(container, failed.data),
    errorMessage: "couldn't mark the Item Failed",
    afterwards: (failed) => slimFinishedJob(container, failed),
  });
}

/**
 * The BullMQ worker that consumes the Item processing queue (options: `workerOptions`).
 * It carries Process Item jobs only, so there is no job-name switch.
 * A job that succeeds keeps only the data worth keeping (`slimFinishedJob`); a
 * failed attempt goes to `onItemProcessingJobFailed`.
 */
export function createItemProcessingWorker(
  container: Container,
  connection: ConnectionOptions,
  limits: WorkerLimits,
): Worker {
  const worker = new Worker(
    ITEM_PROCESSING_QUEUE,
    async (job) => {
      await processItem(container, job.data);
      await slimFinishedJob(container, job);
    },
    workerOptions(connection, limits),
  );
  worker.on("failed", (job, error) => void onItemProcessingJobFailed(container, job, error));
  return worker;
}
