import { inject, injectable } from "inversify";
import { toItemTagsOutput, type ItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";
import { TOKENS } from "@/di/tokens";
import { InvalidTagNameError, ItemTagLimitError, NotFoundError } from "@/domain/errors";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { MAX_TAGS_PER_ITEM } from "@/domain/rules/tagLimits";
import { slugifyTagName } from "@/domain/rules/tagName";

export interface TagItemByNameInput {
  userId: string;
  itemId: string;
  /** The Tag name as the User typed it, not yet slugified. */
  name: string;
}

/**
 * Tags one of the User's Items by name. The name is reduced to its Tag name (the
 * slug); the User's Tag with that name is used, or created when they have none,
 * and put on the Item with Tag source `user`; a name with no valid Tag name is an
 * `InvalidTagNameError`. A Tag the AI had put there becomes the User's, and so
 * does a Tag only the AI had used, which then stays theirs on no Items;
 * repeating the call changes nothing. Returns the Item's Tags.
 * An Item that isn't the User's is a `NotFoundError`, so nothing reveals it exists.
 * A Tag new to the Item past `MAX_TAGS_PER_ITEM` is an `ItemTagLimitError`, and a
 * new Tag past `MAX_TAGS_PER_USER` a `UserTagLimitError`; re-applying a Tag that's
 * already on the Item counts against neither.
 */
@injectable()
export class TagItemUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.TagRepository) private readonly tags: ITagRepository,
  ) {}

  async execute(input: TagItemByNameInput): Promise<ItemTagsOutput> {
    const tagName = slugifyTagName(input.name);
    if (!tagName.ok) throw new InvalidTagNameError(tagName.reason);

    // Before the Tag exists, so tagging an Item that isn't the User's never creates one.
    const item = await this.items.findById(input.userId, input.itemId);
    if (item === null) throw new NotFoundError(`Item ${input.itemId} not found`);

    const onItem = await this.tags.listOnItem(input.userId, input.itemId);
    const alreadyOnItem = onItem.some(({ tag }) => tag.name === tagName.slug);
    // Before the Tag exists, so a full Item doesn't leave a new Tag behind. The
    // repository enforces both limits atomically with its writes; this early check
    // only loses a race, where the loser's new Tag stays on no Item (harmless:
    // Tags outlive their links anyway) and its link is still refused.
    if (!alreadyOnItem && onItem.length >= MAX_TAGS_PER_ITEM) {
      throw new ItemTagLimitError(input.itemId);
    }

    const tag = await this.tags.findOrCreate(input.userId, tagName.slug);
    await this.tags.applyAsUser({ userId: input.userId, itemId: input.itemId, tagId: tag.id });
    return toItemTagsOutput(await this.tags.listOnItem(input.userId, input.itemId));
  }
}
