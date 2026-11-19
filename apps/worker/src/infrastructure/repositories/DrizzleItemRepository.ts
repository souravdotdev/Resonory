import { and, eq, lt, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { items } from "@resonory/db/schema";
import { WORKER_TOKENS } from "@/di/tokens";
import {
  type Item,
  type ItemRef,
  type ItemStatus,
  type ItemType,
  type ReadyItem,
  TAGGING_TEXT_LENGTH,
  type TaggableItem,
} from "@/domain/entities/Item";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { Database } from "@/infrastructure/database/Database";
import { ownedBy } from "@/infrastructure/repositories/ownedBy";

/** The `items` columns ending Processing sets: a Failed Item keeps no title, description, Thumbnail key or Text. */
type FinishedFields = Pick<
  typeof items.$inferInsert,
  "title" | "description" | "thumbnailKey" | "extractedText"
> & {
  status: ItemStatus;
  type: ItemType;
};

/** Items in the `items` table, through Drizzle, always scoped to their User. */
@injectable()
export class DrizzleItemRepository implements IItemRepository {
  constructor(@inject(WORKER_TOKENS.Database) private readonly db: Database) {}

  async findById(ref: ItemRef): Promise<Item | null> {
    const [row] = await this.db
      .select({
        id: items.id,
        userId: items.userId,
        sourceUrl: items.sourceUrl,
        type: items.type,
        status: items.status,
      })
      .from(items)
      .where(ownedBy(ref))
      .limit(1);
    return row ?? null;
  }

  async findTaggable(ref: ItemRef): Promise<TaggableItem | null> {
    const [row] = await this.db
      .select({
        title: items.title,
        description: items.description,
        sourceUrl: items.sourceUrl,
        type: items.type,
        // Cut in Postgres (in characters), so a long Text never leaves the database whole.
        text: sql<string | null>`left(${items.extractedText}, ${TAGGING_TEXT_LENGTH})`,
      })
      .from(items)
      .where(ownedBy(ref))
      .limit(1);
    return row ?? null;
  }

  async markReady(ref: ItemRef, { type, metadata, thumbnailKey, text }: ReadyItem): Promise<void> {
    await this.finish(ref, {
      status: "ready",
      type,
      ...metadata,
      thumbnailKey,
      extractedText: text,
    });
  }

  async markFailed(ref: ItemRef, type: ItemType): Promise<void> {
    await this.finish(ref, { status: "failed", type });
  }

  async findProcessingBefore(cutoff: Date): Promise<Item[]> {
    return this.db
      .select({
        id: items.id,
        userId: items.userId,
        sourceUrl: items.sourceUrl,
        type: items.type,
        status: items.status,
      })
      .from(items)
      .where(and(eq(items.status, "processing"), lt(items.createdAt, cutoff)));
  }

  async markFailedIfProcessing(ref: ItemRef, type: ItemType): Promise<boolean> {
    // The status check is part of the update, so an Item that finished since it was found is untouched.
    const changed = await this.db
      .update(items)
      .set({ status: "failed", type, updatedAt: new Date() })
      .where(and(ownedBy(ref), eq(items.status, "processing")))
      .returning({ id: items.id });
    return changed.length > 0;
  }

  /** Ends the Item's Processing with this status and Item type and, when Ready, the rest it learned. */
  private async finish(ref: ItemRef, fields: FinishedFields): Promise<void> {
    await this.db
      .update(items)
      .set({ ...fields, updatedAt: new Date() })
      .where(ownedBy(ref));
  }
}
