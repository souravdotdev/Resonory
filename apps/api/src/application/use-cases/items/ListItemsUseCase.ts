import { inject, injectable } from "inversify";
import { toItemCardOutput } from "@/application/dto/items/ItemCardOutput";
import type { ListItemsOutput } from "@/application/dto/items/ListItemsOutput";
import { TOKENS } from "@/di/tokens";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";

export interface ListItemsInput {
  userId: string;
}

/**
 * The User's Library: every Item they've saved, Processing and Failed included,
 * newest first, as Item cards. There's no pagination yet, so it's always the
 * last page (`nextCursor: null`).
 */
@injectable()
export class ListItemsUseCase {
  constructor(@inject(TOKENS.ItemRepository) private readonly items: IItemRepository) {}

  async execute(input: ListItemsInput): Promise<ListItemsOutput> {
    const items = await this.items.listForUser(input.userId);
    // No Tags or Thumbnails on the cards yet.
    const cards = await Promise.all(items.map((item) => toItemCardOutput(item, [])));
    return { items: cards, nextCursor: null };
  }
}
