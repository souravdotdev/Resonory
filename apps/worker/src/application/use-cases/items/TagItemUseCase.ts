import { inject, injectable, optional } from "inversify";
import type { TagItemResult } from "@/application/dto/items/TagItemResult";
import { WORKER_TOKENS } from "@/di/tokens";
import type { ItemRef } from "@/domain/entities/Item";
import type { ITagSuggester } from "@/domain/providers/ITagSuggester";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { aiTagNames } from "@/domain/rules/aiTagNames";

/**
 * Runs an Item's AI tagging: tells the model the Item's excerpt and every one
 * of its User's Tag names, cleans the names it answers (`aiTagNames`: the Tag
 * name rule, deduped, no Rejected tag, no new Tag once the User is at the
 * limit, at most 3), and puts them on the Item with Tag source `ai`. Zero
 * names is a valid answer.
 *
 * The User-limit and Rejected-tag checks here save asking for what can't be
 * applied; `applyAsAi` checks the limits again under its locks, which is what
 * actually holds them when writers race. Running it twice on one Item adds
 * nothing new: a Tag already on the Item is left alone.
 *
 * Without a model configured it reads nothing and returns `unconfigured`. A
 * deleted Item, before the model is asked or while it answers, is `missing`.
 * A model error propagates, so the job is retried; it never touches the
 * Item's status, which stays Ready whatever happens here.
 */
@injectable()
export class TagItemUseCase {
  constructor(
    @inject(WORKER_TOKENS.ItemRepository) private readonly items: IItemRepository,
    @inject(WORKER_TOKENS.TagRepository) private readonly tags: ITagRepository,
    // Unbound without AI_TAGGING_API_KEY: then no Item is tagged.
    @inject(WORKER_TOKENS.TagSuggester)
    @optional()
    private readonly suggester: ITagSuggester | null = null,
  ) {}

  async execute(ref: ItemRef): Promise<TagItemResult> {
    if (!this.suggester) return { outcome: "unconfigured" };

    const item = await this.items.findTaggable(ref);
    if (!item) return { outcome: "missing" };

    const [tagNames, rejected] = await Promise.all([
      this.tags.listNames(ref.userId),
      this.tags.listRejectedNames(ref),
    ]);
    const suggested = await this.suggester.suggestTags({ ...item, tagNames });
    const applied = await this.tags.applyAsAi(ref, aiTagNames(suggested, { tagNames, rejected }));
    if (applied === null) return { outcome: "missing" };
    return { outcome: "tagged", suggested, applied };
  }
}
