import { Worker, type ConnectionOptions } from "bullmq";
import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { ITEM_TAGGING_QUEUE } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { tagItem } from "@/interface/processors/tagItem.processor";
import { tagItemFailed } from "@/interface/processors/tagItemFailed.processor";

/** How many Tag Item jobs run at once: BullMQ's default of one, until tagging is tuned. */
const ITEM_TAGGING_CONCURRENCY = 1;

/** What the `failed` handler reads from a BullMQ job. */
interface FailedTagItemJob {
  id?: string;
  name: string;
  data: unknown;
  /** Failed attempts so far, this one included. */
  attemptsMade: number;
  opts: { attempts?: number };
  /**
   * When BullMQ moved the job to the failed set, which it does only when no
   * attempt is left (the last retry, an unrecoverable error, or too many stalls).
   */
  finishedOn?: number;
}

/**
 * The tagging worker's `failed` handler. Every failed attempt is logged with its
 * reason. Once no attempt is left, `tagItemFailed` only logs it: the Item stays
 * Ready, just without AI Tags. A step that throws is logged, never rethrown: it
 * runs from an event listener.
 */
async function onItemTaggingJobFailed(
  container: Container,
  job: FailedTagItemJob | undefined,
  error: Error,
): Promise<void> {
  const logger = container.get<Logger>(WORKER_TOKENS.Logger);

  if (!job) {
    logger.error(
      { queue: ITEM_TAGGING_QUEUE, err: describeError(error) },
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
    await tagItemFailed(container, job.data);
  } catch (finalFailureError) {
    jobLogger.error(
      { err: describeError(finalFailureError) },
      "couldn't log that AI tagging gave up",
    );
  }
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
