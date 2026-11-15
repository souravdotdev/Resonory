import type { Container } from "inversify";
import { TagItemJobSchema } from "@resonory/shared/schemas/queue";
import type { Logger } from "@resonory/logger";
import { WORKER_TOKENS } from "@/di/tokens";

/**
 * Runs after a Tag Item job's last attempt failed: only logs it, with the
 * Item's id. The Item was already Ready and stays so, just without AI Tags;
 * unlike Processing, AI tagging never marks an Item Failed. The failure itself
 * (its error) is logged by the `failed` handler on every attempt.
 */
export async function tagItemFailed(container: Container, data: unknown): Promise<void> {
  const payload = TagItemJobSchema.safeParse(data);
  if (!payload.success) return;

  container
    .get<Logger>(WORKER_TOKENS.Logger)
    .child({ itemId: payload.data.itemId })
    .warn({}, "AI tagging gave up; the Item stays Ready without AI Tags");
}
