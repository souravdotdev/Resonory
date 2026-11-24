import { inject, injectable, optional } from "inversify";
import { toItemCardOutputWithThumbnailUrl } from "@/application/dto/items/ItemCardOutput";
import type { ListItemsOutput } from "@/application/dto/items/ListItemsOutput";
import { TOKENS } from "@/di/tokens";
import type {
  IThumbnailUrlProvider,
  SignedThumbnailUrls,
} from "@/domain/providers/IThumbnailUrlProvider";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";

export interface ListItemsInput {
  userId: string;
}

/**
 * The User's Library: every Item they've saved, Processing and Failed included,
 * newest first, as Item cards with their Tags. There's no pagination yet, so
 * it's always the last page (`nextCursor: null`).
 *
 * Every Thumbnail in the Library is signed in one call. With no Thumbnail
 * provider (Supabase Storage isn't configured), the cards carry no Thumbnail.
 */
@injectable()
export class ListItemsUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.TagRepository) private readonly tags: ITagRepository,
    @inject(TOKENS.ThumbnailUrlProvider)
    @optional()
    private readonly thumbnails?: IThumbnailUrlProvider,
  ) {}

  async execute(input: ListItemsInput): Promise<ListItemsOutput> {
    const items = await this.items.listForUser(input.userId);
    // Every card's Tags in one query and every Thumbnail in one Storage call, never one per card.
    const [tagsOn, thumbnailUrls] = await Promise.all([
      this.tags.listOnItems(
        input.userId,
        items.map((item) => item.id),
      ),
      this.signThumbnails(items.map((item) => item.thumbnailKey)),
    ]);
    const cards = items.map((item) =>
      toItemCardOutputWithThumbnailUrl(
        item,
        tagsOn.get(item.id) ?? [],
        item.thumbnailKey ? (thumbnailUrls.get(item.thumbnailKey) ?? null) : null,
      ),
    );
    return { items: cards, nextCursor: null };
  }

  private async signThumbnails(keys: readonly (string | null)[]): Promise<SignedThumbnailUrls> {
    const present = keys.filter((key): key is string => Boolean(key));
    if (!this.thumbnails || present.length === 0) return new Map();
    return this.thumbnails.resolveMany(present);
  }
}
