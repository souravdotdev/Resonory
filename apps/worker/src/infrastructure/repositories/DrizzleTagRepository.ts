import { and, asc, count, eq, exists, inArray, notExists, or } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { items, itemTags, rejectedItemTags, tags, users } from "@resonory/db/schema";
import { WORKER_TOKENS } from "@/di/tokens";
import type { ItemRef } from "@/domain/entities/Item";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import type { Database } from "@/infrastructure/database/Database";

/**
 * The Tags AI tagging reads and writes: `tags`, `item_tags` and
 * `rejected_item_tags`, through Drizzle. The writer mirrors the locking of the
 * API's `DrizzleTagRepository` (`findOrCreate`, `applyAsUser`), in one
 * transaction (docs/tags.md, Concurrency).
 */
@injectable()
export class DrizzleTagRepository implements ITagRepository {
  constructor(@inject(WORKER_TOKENS.Database) private readonly db: Database) {}

  async listNames(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: tags.name })
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          // A Tag only the AI used is left out once it's on no Items, so the model
          // isn't offered it back as one of the User's. One its Items' deletion left
          // there lingers until applyAsAi deletes it (deleteUnusedAiTags), so what's
          // listed is exactly what applyAsAi counts towards the User's limit.
          or(
            eq(tags.origin, "user"),
            exists(
              this.db
                .select({ tagId: itemTags.tagId })
                .from(itemTags)
                .where(eq(itemTags.tagId, tags.id)),
            ),
          ),
        ),
      )
      .orderBy(asc(tags.name))
      // A User has at most this many Tags; the bound keeps a runaway list from going unbounded.
      .limit(MAX_TAGS_PER_USER);
    return rows.map((row) => row.name);
  }

  async listRejectedNames({ itemId, userId }: ItemRef): Promise<string[]> {
    const rows = await this.db
      .select({ name: rejectedItemTags.tagName })
      .from(rejectedItemTags)
      .where(and(eq(rejectedItemTags.itemId, itemId), eq(rejectedItemTags.userId, userId)))
      .orderBy(asc(rejectedItemTags.tagName));
    return rows.map((row) => row.name);
  }

  async applyAsAi({ itemId, userId }: ItemRef, names: string[]): Promise<string[] | null> {
    return this.db.transaction(async (tx) => {
      // The Item's row first, then the User's: the order the API takes them in
      // (#173), so the two writers can't deadlock. Locking the Item's row makes
      // links to it take turns, so the count below is the one the links land on;
      // `no key update` still lets the foreign keys on it be checked.
      const [item] = await tx
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.userId, userId)))
        .for("no key update");
      // Deleted (or not the User's). Once locked it can't be deleted until
      // commit, so the inserts below can't fail their foreign keys.
      if (item === undefined) return null;

      // Locking the User's row makes their Tag creations take turns, so each
      // counts the Tags the last one committed and the limit can't be raced past.
      // Untagging takes it too before deleting a Tag only the AI used, so the
      // Tags read below are never ones it's deleting: a Tag it deleted first is
      // made again, and one linked here first isn't deleted.
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for("no key update");
      if (names.length === 0) return [];

      // Checked again here, not only by the use case, for a rejection recorded
      // while the model was answering. Untagging locks the Item's row too, so no
      // rejection of this Item can commit until this transaction does.
      const rejected = await tx
        .select({ name: rejectedItemTags.tagName })
        .from(rejectedItemTags)
        .where(and(eq(rejectedItemTags.itemId, itemId), inArray(rejectedItemTags.tagName, names)));
      const rejectedNames = new Set(rejected.map((row) => row.name));
      const wanted = names.filter((name) => !rejectedNames.has(name));
      if (wanted.length === 0) return [];

      // Before reading the User's Tags, so none read here is then deleted, and
      // before counting them, so a Tag only the AI used that its Items' deletion
      // left on no Items never holds a place towards the limit.
      await this.deleteUnusedAiTags(tx, userId);

      const existing = await tx
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.name, wanted)));
      const tagIdsByName = new Map(existing.map((row) => [row.name, row.id]));

      const links = await tx
        .select({ tagId: itemTags.tagId })
        .from(itemTags)
        .where(eq(itemTags.itemId, itemId));
      const linked = new Set(links.map((row) => row.tagId));
      let freeSlots = MAX_TAGS_PER_ITEM - links.length;
      // Counted only once a name would create a Tag.
      let owned: number | undefined;

      const applied: string[] = [];
      for (const name of wanted) {
        let tagId = tagIdsByName.get(name);
        // Already on the Item, from either source: left as it is, taking no slot.
        if (tagId !== undefined && linked.has(tagId)) continue;
        // A full Item takes nothing more, and no Tag is made that couldn't go on it.
        if (freeSlots <= 0) break;

        if (tagId === undefined) {
          owned ??= await this.tagCount(tx, userId);
          // At the User's limit only their existing Tags are reused.
          if (owned >= MAX_TAGS_PER_USER) continue;
          // The lock already serializes same-name creates; tags_user_id_name_unique
          // stays the backstop, and a conflict there means the Tag now exists.
          // Made as only the AI's; an existing Tag's origin is never touched, so
          // a Tag the User applied is never made the AI's.
          const [created] = await tx
            .insert(tags)
            .values({ userId, name, origin: "ai" })
            .onConflictDoNothing({ target: [tags.userId, tags.name] })
            .returning({ id: tags.id });
          if (created !== undefined) owned++;
          tagId = created?.id ?? (await this.tagIdByName(tx, userId, name));
          tagIdsByName.set(name, tagId);
        }

        // A link already there, of either source, is never touched.
        const [link] = await tx
          .insert(itemTags)
          .values({ itemId, tagId, userId, source: "ai" })
          .onConflictDoNothing({ target: [itemTags.itemId, itemTags.tagId] })
          .returning({ tagId: itemTags.tagId });
        linked.add(tagId);
        if (link === undefined) continue;
        freeSlots--;
        applied.push(name);
      }
      return applied;
    });
  }

  // The User's Tags only the AI used that are on no Items: untagging deletes one
  // with its last link, but deleting its Items leaves it. Under the User's lock.
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

  private async tagCount(tx: Transaction, userId: string): Promise<number> {
    const [{ owned } = { owned: 0 }] = await tx
      .select({ owned: count() })
      .from(tags)
      .where(eq(tags.userId, userId));
    return owned;
  }

  private async tagIdByName(tx: Transaction, userId: string, name: string): Promise<string> {
    const [row] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, name)))
      .limit(1);
    return row!.id;
  }
}

/** The transaction handle `Database.transaction` passes its callback. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
