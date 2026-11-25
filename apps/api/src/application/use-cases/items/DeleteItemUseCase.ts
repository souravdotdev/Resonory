import { inject, injectable, optional } from "inversify";
import { TOKENS } from "@/di/tokens";
import { NotFoundError } from "@/domain/errors";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import { thumbnailKeyOf } from "@/domain/rules/thumbnailKey";

export interface DeleteItemInput {
  userId: string;
  itemId: string;
}

/**
 * Item deletion: permanently deletes one of the User's Items, at any point,
 * Processing included. Its Text goes with it, and so do its Tag links and
 * Rejected tags; the User's Tags stay. An Item that isn't the User's, or was
 * already deleted, is a `NotFoundError`, so nothing reveals whose an Item is.
 *
 * The row goes first, then the Item's Thumbnail object at its fixed key,
 * whatever the row's `thumbnail_key` said. With no Thumbnail store (Supabase
 * Storage isn't configured), that step is skipped.
 */
@injectable()
export class DeleteItemUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.ThumbnailStore)
    @optional()
    private readonly thumbnails?: IThumbnailStore,
  ) {}

  async execute(input: DeleteItemInput): Promise<void> {
    const deleted = await this.items.delete(input.userId, input.itemId);
    if (!deleted) throw new NotFoundError(`Item ${input.itemId} not found`);
    await this.thumbnails?.delete(thumbnailKeyOf(input));
  }
}
