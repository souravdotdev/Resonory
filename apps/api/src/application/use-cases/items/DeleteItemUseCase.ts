import { inject, injectable } from "inversify";
import { TOKENS } from "@/di/tokens";
import { NotFoundError } from "@/domain/errors";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";

export interface DeleteItemInput {
  userId: string;
  itemId: string;
}

/**
 * Item deletion: permanently deletes one of the User's Items, at any point,
 * Processing included. Its Text goes with it, and so do its Tag links and
 * Rejected tags; the User's Tags stay. An Item that isn't the User's, or was
 * already deleted, is a `NotFoundError`, so nothing reveals whose an Item is.
 */
@injectable()
export class DeleteItemUseCase {
  constructor(@inject(TOKENS.ItemRepository) private readonly items: IItemRepository) {}

  async execute(input: DeleteItemInput): Promise<void> {
    const deleted = await this.items.delete(input.userId, input.itemId);
    if (!deleted) throw new NotFoundError(`Item ${input.itemId} not found`);
  }
}
