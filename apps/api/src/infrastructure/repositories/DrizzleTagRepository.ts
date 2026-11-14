import { and, asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { items, itemTags, tags, users } from "@resonory/db/schema";
import { TOKENS } from "@/di/tokens";
import type { AppliedTag, Tag } from "@/domain/entities/Tag";
import { ItemTagLimitError, UserTagLimitError } from "@/domain/errors";
import type { ITagRepository, ItemTagRef } from "@/domain/repositories/ITagRepository";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import type { Database } from "@/infrastructure/database/Database";
import { toTag } from "@/infrastructure/mappers/tagMapper";

/** Tags in the `tags` table and the Tags on Items in `item_tags`, through Drizzle. */
@injectable()
export class DrizzleTagRepository implements ITagRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Database) {}

  async findOrCreate(userId: string, name: string): Promise<Tag> {
    return this.db.transaction(async (tx) => {
      // Locking the User's row makes their Tag creations take turns, so each
      // counts the Tags the last one committed and the limit can't be raced past.
      // `no key update` still lets the foreign keys on their rows be checked.
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for("no key update");

      const [existing] = await tx
        .select()
        .from(tags)
        .where(and(eq(tags.userId, userId), eq(tags.name, name)))
        .limit(1);
      if (existing !== undefined) return toTag(existing);

      const [{ owned } = { owned: 0 }] = await tx
        .select({ owned: count() })
        .from(tags)
        .where(eq(tags.userId, userId));
      if (owned >= MAX_TAGS_PER_USER) throw new UserTagLimitError(userId);

      // The lock already serializes same-name creates; tags_user_id_name_unique
      // stays the backstop, and a conflict there means the Tag now exists.
      const [created] = await tx
        .insert(tags)
        .values({ userId, name })
        .onConflictDoNothing({ target: [tags.userId, tags.name] })
        .returning();
      if (created !== undefined) return toTag(created);

      const [raced] = await tx
        .select()
        .from(tags)
        .where(and(eq(tags.userId, userId), eq(tags.name, name)))
        .limit(1);
      return toTag(raced!);
    });
  }

  async applyAsUser({ userId, itemId, tagId }: ItemTagRef): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Locking the Item's row makes links to it take turns, so the count below
      // is the one the link lands on. Residual race: a writer that links Tags
      // without taking this lock (the AI tagger, once it exists) can still push
      // an Item past the limit, so it has to lock the same row.
      await tx
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.userId, userId)))
        .for("no key update");

      const [{ onItem, linked } = { onItem: 0, linked: 0 }] = await tx
        .select({
          onItem: count(),
          linked: sql<number>`count(*) filter (where ${itemTags.tagId} = ${tagId})`.mapWith(Number),
        })
        .from(itemTags)
        .where(eq(itemTags.itemId, itemId));
      // Re-applying a Tag that's already on the Item doesn't count against the limit.
      if (linked === 0 && onItem >= MAX_TAGS_PER_ITEM) throw new ItemTagLimitError(itemId);

      // The composite foreign keys refuse a link between one User's Item and another's Tag.
      await tx
        .insert(itemTags)
        .values({ itemId, tagId, userId, source: "user" })
        .onConflictDoUpdate({
          target: [itemTags.itemId, itemTags.tagId],
          set: { source: "user" },
          // Only the AI's link changes; the User's own is left untouched.
          setWhere: eq(itemTags.source, "ai"),
        });
    });
  }

  async listOnItem(userId: string, itemId: string): Promise<AppliedTag[]> {
    const rows = await this.db
      .select({ tag: getTableColumns(tags), source: itemTags.source })
      .from(itemTags)
      .innerJoin(tags, eq(tags.id, itemTags.tagId))
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.userId, userId)))
      .orderBy(asc(itemTags.createdAt), asc(tags.name));
    return rows.map(({ tag, source }) => ({ tag: toTag(tag), source }));
  }

  async listForUser(userId: string): Promise<Tag[]> {
    // A link's created_at is when the Tag went on the Item; upgrading an AI link to
    // the User's keeps it. A Tag on no Items has no links, so it falls back to its own.
    const lastUsedAt = sql`coalesce(max(${itemTags.createdAt}), ${tags.createdAt})`;
    const rows = await this.db
      .select(getTableColumns(tags))
      .from(tags)
      .leftJoin(itemTags, eq(itemTags.tagId, tags.id))
      .where(eq(tags.userId, userId))
      .groupBy(tags.id)
      .orderBy(desc(lastUsedAt), asc(tags.name))
      // A User has at most this many Tags; the bound keeps a runaway list from going unbounded.
      .limit(MAX_LISTED_TAGS);
    return rows.map(toTag);
  }

  async findById(userId: string, tagId: string): Promise<Tag | null> {
    const [row] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1);
    return row ? toTag(row) : null;
  }

  async removeFromItem({ userId, itemId, tagId }: ItemTagRef): Promise<void> {
    // Only the link goes; the Tag stays the User's even when it's on no Items now.
    await this.db
      .delete(itemTags)
      .where(
        and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId), eq(itemTags.userId, userId)),
      );
  }
}

const MAX_LISTED_TAGS = 1000;
