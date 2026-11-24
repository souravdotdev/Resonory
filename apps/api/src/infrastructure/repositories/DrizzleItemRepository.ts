import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { items } from "@resonory/db/schema";
import { TOKENS } from "@/di/tokens";
import type { Item, ItemSummary } from "@/domain/entities/Item";
import type { IItemRepository, NewItem } from "@/domain/repositories/IItemRepository";
import type { Database } from "@/infrastructure/database/Database";
import { toItem, toItemSummary } from "@/infrastructure/mappers/itemMapper";

// Every column but search_vector, which is a search detail, not part of the Item.
const { searchVector: _searchVector, ...itemColumns } = getTableColumns(items);
// An Item summary's columns: the Item's without extracted_text, its Text.
const { extractedText: _extractedText, ...itemSummaryColumns } = itemColumns;

/** Items in the `items` table, through Drizzle. */
@injectable()
export class DrizzleItemRepository implements IItemRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Database) {}

  async create(newItem: NewItem): Promise<Item> {
    // Status defaults to processing and the type stays null until Processing decides it.
    const [row] = await this.db
      .insert(items)
      .values({ userId: newItem.userId, sourceUrl: newItem.sourceUrl })
      .returning(itemColumns);
    return toItem(row!);
  }

  async findById(userId: string, itemId: string): Promise<Item | null> {
    // Scoped by user_id, so another User's Item looks the same as no Item.
    const [row] = await this.db
      .select(itemColumns)
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.userId, userId)))
      .limit(1);
    return row === undefined ? null : toItem(row);
  }

  async listForUser(userId: string): Promise<ItemSummary[]> {
    // Served by items_user_id_created_at_idx; the id breaks ties between equal creation times.
    // Selects no extracted_text: up to 100k characters per Item that no card shows.
    const rows = await this.db
      .select(itemSummaryColumns)
      .from(items)
      .where(eq(items.userId, userId))
      .orderBy(desc(items.createdAt), desc(items.id));
    return rows.map(toItemSummary);
  }
}
