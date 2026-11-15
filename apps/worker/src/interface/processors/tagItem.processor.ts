import { UnrecoverableError } from "bullmq";
import type { Container } from "inversify";
import { z } from "zod";
import { TagItemJobSchema } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import type { TagItemUseCase } from "@/application/use-cases/items/TagItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";

/**
 * Runs a Tag Item job: checks its payload, then runs the Item's AI tagging.
 * A malformed payload can never succeed, so it fails without a retry; any error
 * from the tagging itself (the model's first) propagates, so BullMQ retries the
 * job. Only counts are logged, never Tag names: they say what the User reads.
 */
export async function tagItem(container: Container, data: unknown): Promise<void> {
  const payload = TagItemJobSchema.safeParse(data);
  if (!payload.success) {
    throw new UnrecoverableError(`Invalid Tag Item payload:\n${z.prettifyError(payload.error)}`);
  }

  const logger = container.get<Logger>(WORKER_TOKENS.Logger).child({ itemId: payload.data.itemId });

  const useCase = container.get<TagItemUseCase>(WORKER_TOKENS.TagItemUseCase);
  const result = await useCase.execute(payload.data);

  switch (result.outcome) {
    case "tagged":
      logger.info(
        { suggested: result.suggested.length, applied: result.applied.length },
        "Item is AI-tagged",
      );
      break;
    case "unconfigured":
      logger.info({}, "AI tagging isn't configured; the Item gets no AI Tags");
      break;
    case "missing":
      logger.info({}, "Item no longer exists; nothing to tag");
      break;
  }
}
