import { UnrecoverableError, Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { ITEM_PROCESSING_QUEUE, PROCESS_ITEM_JOB } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { SWEEP_STUCK_ITEMS_JOB } from "@/infrastructure/queue/stuckItemSweepSchedule";
import type { WorkerLimits } from "@/infrastructure/queue/workerLimitsEnv";
import { handleFailedJob, type FailedJob } from "@/interface/onJobFailed";
import { workerOptions } from "@/interface/workerOptions";
import { processItem, slimProcessItemData } from "@/interface/processors/processItem.processor";
import { processItemFailed } from "@/interface/processors/processItemFailed.processor";
import { sweepStuckItems } from "@/interface/processors/sweepStuckItems.processor";

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
 * is left, a Process Item job's Item becomes Failed, and then the job keeps only
 * the data worth keeping (`slimFinishedJob`). A payload that names no Item changes
 * no Item, and a job that isn't a Process Item job never does.
 */
function onItemProcessingJobFailed(
  container: Container,
  job: (FailedJob & ProcessItemJob) | undefined,
  error: Error,
): Promise<void> {
  return handleFailedJob(container, ITEM_PROCESSING_QUEUE, job, error, {
    // Only a Process Item job names an Item. Any other job (the sweep, or one with an
    // unknown name) has only the failure `handleFailedJob` already logged.
    run: async (failed) => {
      if (failed.name === PROCESS_ITEM_JOB) await processItemFailed(container, failed.data);
    },
    errorMessage: "couldn't mark the Item Failed",
    afterwards: (failed) => slimFinishedJob(container, failed),
  });
}

/**
 * The BullMQ worker that consumes the Item processing queue (options: `workerOptions`).
 * It carries Process Item jobs and the repeating stuck-Item sweep job, and
 * fails any other job name without a retry. A job that succeeds keeps only the
 * data worth keeping (`slimFinishedJob`); a failed attempt goes to
 * `onItemProcessingJobFailed`, which changes no Item for any job but a Process
 * Item job, by its name.
 */
export function createItemProcessingWorker(
  container: Container,
  connection: ConnectionOptions,
  limits: WorkerLimits,
): Worker {
  const worker = new Worker(
    ITEM_PROCESSING_QUEUE,
    async (job) => {
      switch (job.name) {
        case PROCESS_ITEM_JOB:
          await processItem(container, job.data);
          break;
        case SWEEP_STUCK_ITEMS_JOB:
          await sweepStuckItems(container, job.data);
          break;
        default:
          throw new UnrecoverableError(
            `Unknown job name on the Item processing queue: ${job.name}`,
          );
      }
      await slimFinishedJob(container, job);
    },
    workerOptions(connection, limits),
  );
  worker.on("failed", (job, error) => void onItemProcessingJobFailed(container, job, error));
  return worker;
}
