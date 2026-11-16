import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { WORKER_TOKENS } from "@/di/tokens";

/** What a `failed` handler reads from a BullMQ job. */
export interface FailedJob {
  id?: string;
  name: string;
  data: unknown;
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

/** What one queue does once a job has failed for good, on top of the shared handling. */
interface FinalFailure<Job extends FailedJob> {
  /** The queue's own step. If it throws, `errorMessage` is logged and the error is not rethrown. */
  run(job: Job): Promise<void>;
  errorMessage: string;
  /** Runs after `run`, whether or not it threw (e.g. slimming the job's data). Must not throw. */
  afterwards?(job: Job): Promise<void>;
}

/**
 * The `failed` handler both workers share. Every failed attempt is logged with
 * its reason. Once no attempt is left, however the job failed (its last retry,
 * an unrecoverable error, or a stall), the queue's own final-failure step runs.
 * A step that throws is logged, never rethrown: it runs from an event listener.
 */
export async function handleFailedJob<Job extends FailedJob>(
  container: Container,
  queue: string,
  job: Job | undefined,
  error: Error,
  finalFailure: FinalFailure<Job>,
): Promise<void> {
  const logger = container.get<Logger>(WORKER_TOKENS.Logger);

  if (!job) {
    logger.error({ queue, err: describeError(error) }, "a job on the queue failed, with no job");
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
    await finalFailure.run(job);
  } catch (finalFailureError) {
    jobLogger.error({ err: describeError(finalFailureError) }, finalFailure.errorMessage);
  }
  await finalFailure.afterwards?.(job);
}
