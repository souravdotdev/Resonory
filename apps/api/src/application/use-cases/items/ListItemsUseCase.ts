import { inject, injectable, optional } from "inversify";
import { toItemCardOutputWithThumbnailUrl } from "@/application/dto/items/ItemCardOutput";
import type { ListItemsOutput } from "@/application/dto/items/ListItemsOutput";
import { TOKENS } from "@/di/tokens";
import type { IThumbnailUrlProvider } from "@/domain/providers/IThumbnailUrlProvider";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";

export interface ListItemsInput {
  userId: string;
}

/**
 * The User's Library: every Item they've saved, Processing and Failed included,
 * newest first, as Item cards. There's no pagination yet, so it's always the
 * last page (`nextCursor: null`).
 *
 * Every Thumbnail in the Library is signed in one call. With no Thumbnail
 * provider (Supabase Storage isn't configured), the cards carry no Thumbnail.
 */
@injectable()
export class ListItemsUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.ThumbnailUrlProvider)
    @optional()
    private readonly thumbnails?: IThumbnailUrlProvider,
  ) {}

  async execute(input: ListItemsInput): Promise<ListItemsOutput> {
    const items = await this.items.listForUser(input.userId);
    const thumbnailUrls = await this.signThumbnails(items.map((item) => item.thumbnailKey));
    const cards = items.map((item) =>
      toItemCardOutputWithThumbnailUrl(
        item,
        // No Tags on the cards yet.
        [],
        item.thumbnailKey ? (thumbnailUrls.get(item.thumbnailKey) ?? null) : null,
      ),
    );
    return { items: cards, nextCursor: null };
  }

  private async signThumbnails(
    keys: readonly (string | null)[],
  ): Promise<ReadonlyMap<string, string | null>> {
    const present = keys.filter((key): key is string => Boolean(key));
    if (!this.thumbnails || present.length === 0) return new Map();
    return this.thumbnails.resolveMany(present);
  }
}
