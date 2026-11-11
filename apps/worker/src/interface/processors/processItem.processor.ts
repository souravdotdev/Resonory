import { UnrecoverableError } from "bullmq";
import type { Container } from "inversify";
import { z } from "zod";
import { ProcessItemJobSchema } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import type { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";

/**
 * Runs a Process Item job: checks its payload, then runs the Item's Processing.
 * A malformed payload can never succeed, so it fails without a retry; any error
 * from the Processing itself propagates, so BullMQ retries the job.
 */
export async function processItem(container: Container, data: unknown): Promise<void> {
  const payload = ProcessItemJobSchema.safeParse(data);
  if (!payload.success) {
    throw new UnrecoverableError(
      `Invalid Process Item payload:\n${z.prettifyError(payload.error)}`,
    );
  }

  const logger = container.get<Logger>(WORKER_TOKENS.Logger).child({ itemId: payload.data.itemId });

  // See the comment where WORKER_TOKENS.ProcessItemUseCase is bound in
  // `di/container.ts` for how a future logging ProcessItemUseCase would
  // receive this job-scoped `logger`.
  const useCase = container.get<ProcessItemUseCase>(WORKER_TOKENS.ProcessItemUseCase);
  const result = await useCase.execute(payload.data);

  if (result.outcome === "ready") {
    logger.info(
      {
        type: result.type,
        titled: result.metadata.title !== null,
        pictured: result.thumbnailKey !== null,
        texted: result.text !== null,
      },
      "Item is Ready",
    );
  } else {
    logger.info({}, "Item no longer exists; nothing to process");
  }
}
