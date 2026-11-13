import type { Container } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { PROCESS_ITEM_JOB } from "@resonory/shared/schemas/queue";
import { WORKER_TOKENS } from "@/di/tokens";
import { processItem, slimProcessItemData } from "@/interface/processors/processItem.processor";
import { processItemFailed } from "@/interface/processors/processItemFailed.processor";

/** What the Items worker reads from a BullMQ job to dispatch it, and how it rewrites the job's data. */
export interface ItemsJob {
  name: string;
  data: unknown;
  updateData(data: unknown): Promise<void>;
}

/** How the Items worker handles one job name. */
export interface ItemsJobHandler {
  /** Runs one attempt of the job. */
  process(container: Container, data: unknown): Promise<void>;
  /** Runs once the job has failed and no attempt is left. */
  onFinalFailure(container: Container, data: unknown): Promise<void>;
  /**
   * The job's data worth keeping once it's finished, or undefined to keep it
   * all. BullMQ keeps finished jobs (docs/queue.md), so a large payload
   * stays in Redis unless it's dropped here.
   */
  slimmed(data: unknown): unknown;
}

/** Every job the Items queue carries, by name. */
const ITEMS_JOB_HANDLERS: ReadonlyMap<string, ItemsJobHandler> = new Map([
  [
    PROCESS_ITEM_JOB,
    { process: processItem, onFinalFailure: processItemFailed, slimmed: slimProcessItemData },
  ],
]);

/** The handler for a job name, or undefined for a job the Items queue doesn't carry. */
export function itemsJobHandler(name: string): ItemsJobHandler | undefined {
  return ITEMS_JOB_HANDLERS.get(name);
}

/**
 * Once a job is finished (done, or failed with no attempt left), rewrites its
 * data without what its handler says isn't worth keeping. Never throws: the
 * job's outcome stands either way, so a Redis error here is only logged.
 */
export async function slimFinishedJob(container: Container, job: ItemsJob): Promise<void> {
  const slimmed = itemsJobHandler(job.name)?.slimmed(job.data);
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
