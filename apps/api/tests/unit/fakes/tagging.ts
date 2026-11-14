import type { Item } from "@/domain/entities/Item";
import type { Tag, TagSource } from "@/domain/entities/Tag";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { ItemTagLimitError, UserTagLimitError } from "@/domain/errors";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";

/** A stored Tag link, with the owner and the order it was made in, like an `item_tags` row. */
export interface StoredTagLink {
  userId: string;
  itemId: string;
  tagId: string;
  source: TagSource;
  createdAt: Date;
}

// A Ready Item; each test overrides only what it's about.
export const anItem = (overrides: Partial<Item> & Pick<Item, "id" | "userId">): Item => ({
  sourceUrl: "https://example.com/post",
  type: "article",
  status: "ready",
  title: "A post",
  description: null,
  thumbnailKey: null,
  extractedText: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  ...overrides,
});

/**
 * In-memory Items, Tags and Tag links, behaving like the tables do: one Tag per
 * name per User (find-or-create is atomic, like the insert on
 * `tags_user_id_name_unique`), one link per Item and Tag, Items and Tags
 * scoped to their User, and the Tag limits checked atomically with each write,
 * like the Drizzle adapter's locked transactions. Seed `items`, `tags` and
 * `links` directly to set a scene (pushing skips the limits).
 */
export function taggingInMemory() {
  const items: Item[] = [];
  const tags: Tag[] = [];
  const links: StoredTagLink[] = [];
  // Every write gets the next tick, so creation order is total and deterministic.
  let clock = Date.parse("2026-05-01T00:00:00.000Z");
  const tick = () => new Date((clock += 1000));

  const itemRepository: IItemRepository = {
    create: async () => {
      throw new Error("Saving Items isn't part of tagging");
    },
    findById: async (userId, itemId) =>
      items.find((item) => item.id === itemId && item.userId === userId) ?? null,
  };

  const tagRepository: ITagRepository = {
    findOrCreate: async (userId, name) => {
      const existing = tags.find((tag) => tag.userId === userId && tag.name === name);
      if (existing) return existing;
      if (tags.filter((tag) => tag.userId === userId).length >= MAX_TAGS_PER_USER) {
        throw new UserTagLimitError(userId);
      }
      const createdAt = tick();
      const tag: Tag = {
        id: `00000000-0000-4000-9000-${String(tags.length + 1).padStart(12, "0")}`,
        userId,
        name,
        createdAt,
        updatedAt: createdAt,
      };
      tags.push(tag);
      return tag;
    },
    applyAsUser: async ({ userId, itemId, tagId }) => {
      const existing = links.find((link) => link.itemId === itemId && link.tagId === tagId);
      if (existing) {
        existing.source = "user";
        return;
      }
      if (links.filter((link) => link.itemId === itemId).length >= MAX_TAGS_PER_ITEM) {
        throw new ItemTagLimitError(itemId);
      }
      links.push({ userId, itemId, tagId, source: "user", createdAt: tick() });
    },
    listOnItem: async (userId, itemId) =>
      links
        .filter((link) => link.itemId === itemId && link.userId === userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((link) => ({ tag: tags.find((tag) => tag.id === link.tagId)!, source: link.source })),
  };

  return { itemRepository, tagRepository, items, tags, links, tick };
}
