import { inject, injectable, optional } from "inversify";
import type { FailItemResult } from "@/application/dto/items/FailItemResult";
import { WORKER_TOKENS } from "@/di/tokens";
import type { ItemRef } from "@/domain/entities/Item";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import { failedItemType } from "@/domain/rules/failedItemType";
import { thumbnailKeyOf } from "@/domain/rules/thumbnailKey";

/**
 * Gives up an Item's Processing after its last attempt: marks it Failed. An
 * Item with no Item type yet becomes a Link, so it still displays like any
 * other Item. Why it failed is the caller's to log; it isn't stored.
 *
 * An Item that's gone (Item deletion) has the object at the job's own
 * Thumbnail key deleted, since an attempt may have uploaded it after the API
 * deleted the Item's object. As in ProcessItemUseCase, the key comes from the
 * job's ref, which has no row, so no live Item's Thumbnail is ever touched. A
 * failed delete is handed back with its key for the processor to log.
 */
@injectable()
export class FailItemUseCase {
  constructor(
    @inject(WORKER_TOKENS.ItemRepository) private readonly items: IItemRepository,
    // Unbound without Supabase Storage configured: then there's no object to delete.
    @inject(WORKER_TOKENS.ThumbnailStore)
    @optional()
    private readonly thumbnails: IThumbnailStore | null = null,
  ) {}

  async execute(ref: ItemRef): Promise<FailItemResult> {
    const item = await this.items.findById(ref);
    if (!item) return this.endAsDeleted(ref);

    const type = failedItemType(item.type);
    await this.items.markFailed(ref, type);
    return { outcome: "failed", type };
  }

  private async endAsDeleted(ref: ItemRef): Promise<FailItemResult> {
    if (!this.thumbnails) return { outcome: "missing" };
    const thumbnailKey = thumbnailKeyOf(ref);
    try {
      await this.thumbnails.delete(thumbnailKey);
      return { outcome: "missing" };
    } catch (error) {
      return { outcome: "missing", orphanedThumbnail: { key: thumbnailKey, error } };
    }
  }
}
