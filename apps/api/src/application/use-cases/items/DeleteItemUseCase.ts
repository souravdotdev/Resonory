import { inject, injectable, optional } from "inversify";
import { describeError, type Logger } from "@resonory/logger";
import { TOKENS } from "@/di/tokens";
import type { ItemRef } from "@/domain/entities/Item";
import { NotFoundError } from "@/domain/errors";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import { thumbnailKeyOf } from "@/domain/rules/thumbnailKey";

export type DeleteItemInput = ItemRef;

/**
 * Item deletion: permanently deletes one of the User's Items, at any point,
 * Processing included. Its Text goes with it, and so do its Tag links and
 * Rejected tags; the User's Tags stay. An Item that isn't the User's, or was
 * already deleted, is a `NotFoundError`, so nothing reveals whose an Item is.
 *
 * The row goes first, then the Item's Thumbnail object at its fixed key,
 * whatever the row's `thumbnail_key` said. With no Thumbnail store (Supabase
 * Storage isn't configured), that step is skipped. A Storage failure never
 * stops Item deletion: it's logged with the User, Item and key instead.
 */
@injectable()
export class DeleteItemUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.ThumbnailStore)
    @optional()
    private readonly thumbnails?: IThumbnailStore,
  ) {}

  /** `logger` is the caller's request-scoped logger, passed per call (ADR 0006). */
  async execute(input: DeleteItemInput, logger: Pick<Logger, "warn">): Promise<void> {
    const deleted = await this.items.delete(input.userId, input.itemId);
    if (!deleted) throw new NotFoundError(`Item ${input.itemId} not found`);
    await this.deleteThumbnail(input, logger);
  }

  // Best-effort: a failure leaves an orphan for a later clean-up, found through the log line.
  private async deleteThumbnail(
    input: DeleteItemInput,
    logger: Pick<Logger, "warn">,
  ): Promise<void> {
    if (!this.thumbnails) return;
    const thumbnailKey = thumbnailKeyOf(input);
    try {
      await this.thumbnails.delete(thumbnailKey);
    } catch (error) {
      logger.warn(
        { userId: input.userId, itemId: input.itemId, thumbnailKey, err: describeError(error) },
        "couldn't delete a Thumbnail",
      );
    }
  }
}
