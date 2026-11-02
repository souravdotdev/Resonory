import type { Container } from "inversify";
import { ProcessItemJobSchema } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import type { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";

/**
 * Runs after a Process Item job's last attempt failed: marks its Item Failed.
 * A payload that doesn't parse names no Item, so nothing changes.
 */
export async function processItemFailed(container: Container, data: unknown): Promise<void> {
  const payload = ProcessItemJobSchema.safeParse(data);
  if (!payload.success) return;

  const logger = container.get<Logger>(WORKER_TOKENS.Logger).child({ itemId: payload.data.itemId });

  const useCase = container.get<FailItemUseCase>(WORKER_TOKENS.FailItemUseCase);
  const result = await useCase.execute(payload.data);

  if (result.outcome === "failed") {
    logger.info({ type: result.type }, "Item is Failed");
  } else {
    logger.info({}, "Item no longer exists; nothing to mark Failed");
  }
}
