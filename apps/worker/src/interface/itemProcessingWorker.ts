import { Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { ITEM_PROCESSING_QUEUE } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { processItem, slimProcessItemData } from "@/interface/processors/processItem.processor";
import { processItemFailed } from "@/interface/processors/processItemFailed.processor";

/** How many Process Item jobs run at once: BullMQ's default of one, until Processing is tuned. */
const ITEM_PROCESSING_CONCURRENCY = 1;

/** What the processing worker reads from a BullMQ job, and how it rewrites the job's data. */
interface ProcessItemJob {
  name: string;
  data: unknown;
  updateData(data: unknown): Promise<void>;
}

/** What the `failed` handler reads from a BullMQ job. */
interface FailedProcessItemJob extends ProcessItemJob {
  id?: string;
  /** Failed attempts so far, this one included. */
  attemptsMade: number;
  opts: { attempts?: number };
  /**
   * When BullMQ moved the job to the failed set. BullMQ sets it only when no
   * attempt is left: after the last retry, an unrecoverable error, or a job
   * that stalled more than the allowed number of times. A retried attempt has none.
   */
  finishedOn?: number;
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
 * The processing worker's `failed` handler. Every failed attempt is logged with
 * its reason. Once no attempt is left, however the job failed (its last retry,
 * an unrecoverable error, or a stall), its Item becomes Failed, and then the job
 * keeps only the data worth keeping (`slimFinishedJob`). A final-failure step
 * that throws is logged, never rethrown: it runs from an event listener. A
 * payload that names no Item changes no Item.
 */
async function onItemProcessingJobFailed(
  container: Container,
  job: FailedProcessItemJob | undefined,
  error: Error,
): Promise<void> {
  const logger = container.get<Logger>(WORKER_TOKENS.Logger);

  if (!job) {
    logger.error(
      { queue: ITEM_PROCESSING_QUEUE, err: describeError(error) },
      "a job on the queue failed, with no job",
    );
    return;
  }

  const jobLogger = logger.child({ jobId: job.id, jobName: job.name });
  const attempts = Math.max(job.opts.attempts ?? 1, 1);
  const final = typeof job.finishedOn === "number";
  jobLogger.error(
    { attemptsMade: job.attemptsMade, attempts, willRetry: !final, err: describeError(error) },
    "job failed",
  );
  if (!final) return;

  try {
    await processItemFailed(container, job.data);
  } catch (finalFailureError) {
    jobLogger.error({ err: describeError(finalFailureError) }, "couldn't mark the Item Failed");
  }
  await slimFinishedJob(container, job);
}

/**
 * The BullMQ worker that consumes the Item processing queue, on the given Redis
 * connection. It carries Process Item jobs only, so there is no job-name switch.
 * A job that succeeds keeps only the data worth keeping (`slimFinishedJob`); a
 * failed attempt goes to `onItemProcessingJobFailed`.
 */
export function createItemProcessingWorker(
  container: Container,
  connection: ConnectionOptions,
): Worker {
  const worker = new Worker(
    ITEM_PROCESSING_QUEUE,
    async (job) => {
      await processItem(container, job.data);
      await slimFinishedJob(container, job);
    },
    { connection, concurrency: ITEM_PROCESSING_CONCURRENCY },
  );
  worker.on("failed", (job, error) => void onItemProcessingJobFailed(container, job, error));
  return worker;
}
