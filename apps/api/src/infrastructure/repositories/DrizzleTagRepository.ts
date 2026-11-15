import { and, asc, count, desc, eq, getTableColumns, notExists, or, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { items, itemTags, rejectedItemTags, tags, users } from "@resonory/db/schema";
import { TOKENS } from "@/di/tokens";
import type { AppliedTag, Tag } from "@/domain/entities/Tag";
import { ItemTagLimitError, NotFoundError, UserTagLimitError } from "@/domain/errors";
import type { ITagRepository, ItemTagRef } from "@/domain/repositories/ITagRepository";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import type { Database } from "@/infrastructure/database/Database";
import { toTag } from "@/infrastructure/mappers/tagMapper";

/**
 * Tags in the `tags` table, the Tags on Items in `item_tags` and Rejected tags in
 * `rejected_item_tags`, through Drizzle.
 */
@injectable()
export class DrizzleTagRepository implements ITagRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Database) {}

  async findOrCreate(userId: string, name: string): Promise<Tag> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);

      const findByName = async () => {
        const [row] = await tx
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), eq(tags.name, name)))
          .limit(1);
        return row;
      };

      const existing = await findByName();
      // The User has named it, so it's theirs now, and never deleted for being on
      // no Items. Under the lock, so an untag can't be deleting it meanwhile.
      if (existing?.origin === "ai") {
        const [claimed] = await tx
          .update(tags)
          .set({ origin: "user" })
          .where(eq(tags.id, existing.id))
          .returning();
        return toTag(claimed!);
      }
      if (existing !== undefined) return toTag(existing);

      // Before counting, so a Tag only the AI used that its Items' deletion left
      // on no Items never holds a place towards the limit.
      await this.deleteUnusedAiTags(tx, userId);
      const [{ owned } = { owned: 0 }] = await tx
        .select({ owned: count() })
        .from(tags)
        .where(eq(tags.userId, userId));
      if (owned >= MAX_TAGS_PER_USER) throw new UserTagLimitError(userId);

      // The lock already serializes same-name creates; tags_user_id_name_unique
      // stays the backstop, and a conflict there means the Tag now exists.
      const [created] = await tx
        .insert(tags)
        .values({ userId, name, origin: "user" })
        .onConflictDoNothing({ target: [tags.userId, tags.name] })
        .returning();
      if (created !== undefined) return toTag(created);

      return toTag((await findByName())!);
    });
  }

  async applyAsUser({ userId, itemId, tagId }: ItemTagRef): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Locking the Item's row makes links to it take turns, so the count below
      // is the one the link lands on. Residual race: a writer that links Tags
      // without taking this lock (the AI tagger, once it exists) can still push
      // an Item past the limit, so it has to lock the same row. No row means it was
      // deleted since the use case found it; once locked it can't be deleted until
      // commit, so the insert below can't then fail its foreign key as a 500. A Tag
      // findOrCreate just made for this call stays on no Item, which is harmless:
      // Tags outlive their links anyway.
      if (!(await this.lockItem(tx, userId, itemId))) {
        throw new NotFoundError(`Item ${itemId} not found`);
      }

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
      // The User has applied it, so it's theirs now and stays theirs. Through
      // TagItemUseCase, findOrCreate has already made it theirs under the User's lock.
      await tx
        .update(tags)
        .set({ origin: "user" })
        .where(and(eq(tags.id, tagId), eq(tags.origin, "ai")));
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
    // A Tag only the AI used is left out once it's on no Items: untagging deletes
    // it, but one whose Items were all deleted lingers until the User's next Tag
    // is created (deleteUnusedAiTags).
    const isListed = or(eq(tags.origin, "user"), sql`count(${itemTags.tagId}) > 0`);
    const rows = await this.db
      .select(getTableColumns(tags))
      .from(tags)
      .leftJoin(itemTags, eq(itemTags.tagId, tags.id))
      .where(eq(tags.userId, userId))
      .groupBy(tags.id)
      .having(isListed)
      .orderBy(desc(lastUsedAt), asc(tags.name))
      // A User has at most this many Tags; the bound keeps a runaway list from going unbounded.
      .limit(MAX_TAGS_PER_USER);
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
    await this.db.transaction(async (tx) => {
      // The Item's row, then the User's: the order the AI writer takes them in, so
      // the two can't deadlock. The User's lock makes the check below on the Tag's
      // other links wait for an AI writer putting it on another Item, so the Tag
      // ends up deleted or on an Item, never both. The Item's lock makes the AI
      // writer's own Rejected tag check on this Item wait for this one. No Item,
      // so no link to take off.
      if (!(await this.lockItemThenUser(tx, userId, itemId))) return;

      const [removed] = await tx
        .delete(itemTags)
        .where(
          and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId), eq(itemTags.userId, userId)),
        )
        .returning({ tagId: itemTags.tagId });
      // No link, so nothing was taken off and nothing is rejected.
      if (removed === undefined) return;

      // The link's composite foreign key means the Tag exists and is the User's.
      const [tag] = await tx
        .select({ name: tags.name })
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
      // Rejected by name, so it outlives the Tag. A name already rejected for the
      // Item keeps its first row.
      await tx
        .insert(rejectedItemTags)
        .values({ itemId, userId, tagName: tag!.name })
        .onConflictDoNothing({ target: [rejectedItemTags.itemId, rejectedItemTags.tagName] });

      // A Tag the User applied stays theirs on no Items; one only the AI used goes
      // with its last link. The Rejected tag above is kept, being keyed by name.
      await tx
        .delete(tags)
        .where(
          and(
            eq(tags.id, tagId),
            eq(tags.origin, "ai"),
            notExists(
              tx.select({ tagId: itemTags.tagId }).from(itemTags).where(eq(itemTags.tagId, tagId)),
            ),
          ),
        );
    });
  }

  // Locks the User's row (`no key update`, so the foreign keys on their rows can
  // still be checked). It makes their Tag creations take turns, so each counts
  // the Tags the last one committed and the limit can't be raced past.
  private async lockUser(tx: Transaction, userId: string): Promise<void> {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("no key update");
  }

  // Locks the Item's row (`no key update`, so the foreign keys to it can still be
  // checked), resolving to false when it doesn't exist or isn't the User's. Once
  // locked it can't be deleted until the transaction ends.
  private async lockItem(tx: Transaction, userId: string, itemId: string): Promise<boolean> {
    const [item] = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.userId, userId)))
      .for("no key update");
    return item !== undefined;
  }

  // The Item's row, then the User's: the order the AI writer takes them in, so
  // the two can't deadlock. Locks nothing more, resolving to false, without the Item.
  private async lockItemThenUser(
    tx: Transaction,
    userId: string,
    itemId: string,
  ): Promise<boolean> {
    if (!(await this.lockItem(tx, userId, itemId))) return false;
    await this.lockUser(tx, userId);
    return true;
  }

  // The User's Tags only the AI used that are on no Items: untagging deletes one
  // with its last link, but deleting its Items leaves it. Under the User's lock,
  // so the AI writer can't be putting one on an Item meanwhile.
  private async deleteUnusedAiTags(tx: Transaction, userId: string): Promise<void> {
    await tx
      .delete(tags)
      .where(
        and(
          eq(tags.userId, userId),
          eq(tags.origin, "ai"),
          notExists(
            tx.select({ tagId: itemTags.tagId }).from(itemTags).where(eq(itemTags.tagId, tags.id)),
          ),
        ),
      );
  }
}

/** The transaction handle `Database.transaction` passes its callback. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
