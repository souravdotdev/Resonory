import { UnrecoverableError } from "bullmq";
import type { Container } from "inversify";
import { z } from "zod";
import { ProcessItemJobSchema } from "@resonory/shared/schemas/queue";
import { describeError, type Logger } from "@resonory/logger";
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
    if ("textError" in result) {
      logger.warn(
        { err: describeError(result.textError) },
        "Text extraction failed; the Item is Ready without Text",
      );
    }
    logger.info(
      {
        type: result.type,
        titled: result.metadata.title !== null,
        pictured: result.thumbnailKey !== null,
        texted: result.text !== null,
        ...(result.textMs !== undefined && { textMs: result.textMs }),
      },
      "Item is Ready",
    );
  } else {
    logger.info({}, "Item no longer exists; nothing to process");
  }
}

/**
 * A finished Process Item job's data without the captured page content and
 * captions, which can be megabytes and are no use once the Item is Ready or
 * Failed; undefined for a job that carried neither, so it's left alone.
 */
export function slimProcessItemData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return undefined;
  if (!("html" in data) && !("captions" in data)) return undefined;
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== "html" && key !== "captions"),
  );
}
