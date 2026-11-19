import { UnrecoverableError } from "bullmq";
import type { Container } from "inversify";
import { z } from "zod";
import { describeError, type Logger } from "@resonory/logger";
import type { SweepStuckItemsUseCase } from "@/application/use-cases/items/SweepStuckItemsUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { SweepStuckItemsJobSchema } from "@/infrastructure/queue/stuckItemSweepSchedule";

/**
 * Runs a sweep job: ends the Items stuck in Processing for as long as the job
 * says, and logs how many it ended and each Item it couldn't. Data that doesn't
 * say how long can never succeed, so it fails without a retry; an error finding
 * the Items propagates, so the job fails and the next scheduled sweep tries again.
 */
export async function sweepStuckItems(container: Container, data: unknown): Promise<void> {
  const payload = SweepStuckItemsJobSchema.safeParse(data);
  if (!payload.success) {
    throw new UnrecoverableError(`Invalid sweep job data:\n${z.prettifyError(payload.error)}`);
  }

  const logger = container.get<Logger>(WORKER_TOKENS.Logger);
  const useCase = container.get<SweepStuckItemsUseCase>(WORKER_TOKENS.SweepStuckItemsUseCase);
  const { ended, errors } = await useCase.execute(payload.data);

  for (const { itemId, error } of errors) {
    logger.warn({ itemId, err: describeError(error) }, "couldn't end a stuck Item");
  }
  logger.info({ ended }, "swept the stuck Items");
}
