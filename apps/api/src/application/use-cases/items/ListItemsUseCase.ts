import { inject, injectable } from "inversify";
import { toItemCardOutput } from "@/application/dto/items/ItemCardOutput";
import type { ListItemsOutput } from "@/application/dto/items/ListItemsOutput";
import { TOKENS } from "@/di/tokens";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";

export interface ListItemsInput {
  userId: string;
}

/**
 * The User's Library: every Item they've saved, Processing and Failed included,
 * newest first, as Item cards with their Tags. There's no pagination yet, so
 * it's always the last page (`nextCursor: null`).
 */
@injectable()
export class ListItemsUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.TagRepository) private readonly tags: ITagRepository,
  ) {}

  async execute(input: ListItemsInput): Promise<ListItemsOutput> {
    const items = await this.items.listForUser(input.userId);
    // Every card's Tags in one query, never one per card.
    const tagsOn = await this.tags.listOnItems(
      input.userId,
      items.map((item) => item.id),
    );
    // No Thumbnails on the cards yet.
    const cards = await Promise.all(
      items.map((item) => toItemCardOutput(item, tagsOn.get(item.id) ?? [])),
    );
    return { items: cards, nextCursor: null };
  }
}
