import { inject, injectable } from "inversify";
import { toItemTagsOutput, type ItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";
import { TOKENS } from "@/di/tokens";
import { NotFoundError } from "@/domain/errors";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository, ItemTagRef } from "@/domain/repositories/ITagRepository";

export type UntagItemInput = ItemTagRef;

/**
 * Takes a Tag off one of the User's Items, whoever put it there (the AI or the
 * User). The Tag stays the User's, even when it's then on no Items, so it can be
 * reused. Taking off a Tag that isn't on the Item changes nothing. Returns the
 * Item's remaining Tags. An Item or Tag that isn't the User's is a `NotFoundError`,
 * so nothing reveals it exists.
 */
@injectable()
export class UntagItemUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.TagRepository) private readonly tags: ITagRepository,
  ) {}

  async execute(input: UntagItemInput): Promise<ItemTagsOutput> {
    const item = await this.items.findById(input.userId, input.itemId);
    if (item === null) throw new NotFoundError(`Item ${input.itemId} not found`);
    const tag = await this.tags.findById(input.userId, input.tagId);
    if (tag === null) throw new NotFoundError(`Tag ${input.tagId} not found`);

    await this.tags.removeFromItem(input);
    return toItemTagsOutput(await this.tags.listOnItem(input.userId, input.itemId));
  }
}
