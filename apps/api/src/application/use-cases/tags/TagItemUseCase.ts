import { inject, injectable } from "inversify";
import { toItemTagsOutput, type ItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";
import { TOKENS } from "@/di/tokens";
import { NotFoundError, ValidationError } from "@/domain/errors";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { MAX_TAG_NAME_LENGTH, slugifyTagName } from "@/domain/rules/tagName";

export interface TagItemInput {
  userId: string;
  itemId: string;
  /** The Tag name as the User typed it, not yet slugified. */
  name: string;
}

/**
 * Tags one of the User's Items by name. The name is reduced to its Tag name (the
 * slug); the User's Tag with that name is used, or created when they have none,
 * and put on the Item with Tag source `user`. A Tag the AI had put there becomes
 * the User's, and repeating the call changes nothing. Returns the Item's Tags.
 * An Item that isn't the User's is a `NotFoundError`, so nothing reveals it exists.
 */
@injectable()
export class TagItemUseCase {
  constructor(
    @inject(TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(TOKENS.TagRepository) private readonly tags: ITagRepository,
  ) {}

  async execute(input: TagItemInput): Promise<ItemTagsOutput> {
    const tagName = slugifyTagName(input.name);
    if (!tagName.ok) {
      throw new ValidationError(
        tagName.reason === "empty"
          ? "A Tag name can't be empty"
          : `A Tag name can be at most ${MAX_TAG_NAME_LENGTH} characters`,
      );
    }

    // Before the Tag exists, so tagging an Item that isn't the User's never creates one.
    const item = await this.items.findById(input.userId, input.itemId);
    if (item === null) throw new NotFoundError(`Item ${input.itemId} not found`);

    const tag = await this.tags.findOrCreate(input.userId, tagName.slug);
    await this.tags.applyAsUser({ userId: input.userId, itemId: input.itemId, tagId: tag.id });
    return toItemTagsOutput(await this.tags.listOnItem(input.userId, input.itemId));
  }
}
