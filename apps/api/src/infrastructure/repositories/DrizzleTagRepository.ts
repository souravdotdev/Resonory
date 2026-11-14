import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { itemTags, tags } from "@resonory/db/schema";
import { TOKENS } from "@/di/tokens";
import type { AppliedTag, Tag } from "@/domain/entities/Tag";
import type { ITagRepository, ItemTagRef } from "@/domain/repositories/ITagRepository";
import type { Database } from "@/infrastructure/database/Database";
import { toTag } from "@/infrastructure/mappers/tagMapper";

/** Tags in the `tags` table and the Tags on Items in `item_tags`, through Drizzle. */
@injectable()
export class DrizzleTagRepository implements ITagRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Database) {}

  async findOrCreate(userId: string, name: string): Promise<Tag> {
    // tags_user_id_name_unique settles a race: the losing insert waits for the
    // winner to commit, inserts nothing, and the select below then finds its Tag.
    const [created] = await this.db
      .insert(tags)
      .values({ userId, name })
      .onConflictDoNothing({ target: [tags.userId, tags.name] })
      .returning();
    if (created !== undefined) return toTag(created);

    const [existing] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, name)))
      .limit(1);
    return toTag(existing!);
  }

  async applyAsUser({ userId, itemId, tagId }: ItemTagRef): Promise<void> {
    // The composite foreign keys refuse a link between one User's Item and another's Tag.
    await this.db
      .insert(itemTags)
      .values({ itemId, tagId, userId, source: "user" })
      .onConflictDoUpdate({
        target: [itemTags.itemId, itemTags.tagId],
        set: { source: "user" },
        // Only the AI's link changes; the User's own is left untouched.
        setWhere: eq(itemTags.source, "ai"),
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
