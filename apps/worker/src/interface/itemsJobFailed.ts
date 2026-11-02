import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { ITEMS_QUEUE } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { itemsJobHandler, type ItemsJob } from "@/interface/itemsJobs";

/** What the `failed` handler reads from a BullMQ job. */
export interface FailedItemsJob extends ItemsJob {
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
 * The Items worker's `failed` handler. Every failed attempt is logged with its
 * reason. Once no attempt is left, however the job failed (its last retry, an
 * unrecoverable error, or a stall), its name's final-failure step runs: a
 * Process Item job's Item becomes Failed. A payload that names no Item, or an
 * unknown job name, changes no Item. It never throws: it runs from an event listener.
 */
export async function onItemsJobFailed(
  container: Container,
  job: FailedItemsJob | undefined,
  error: Error,
): Promise<void> {
  const logger = container.get<Logger>(WORKER_TOKENS.Logger);

  if (!job) {
    logger.error(
      { queue: ITEMS_QUEUE, err: describeError(error) },
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
    await itemsJobHandler(job.name)?.onFinalFailure(container, job.data);
  } catch (markError) {
    jobLogger.error({ err: describeError(markError) }, "couldn't mark the Item Failed");
  }
}
