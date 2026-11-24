import type { Item, ItemSummary } from "@/domain/entities/Item";

/** What saving an Item needs: whose it is and the Source URL exactly as pasted (trimmed). */
export interface NewItem {
  userId: string;
  sourceUrl: string;
}

/** Stores Items. The persistence adapter implements it. */
export interface IItemRepository {
  /**
   * Stores a new Processing Item with no Item type. Source URLs aren't unique:
   * saving the same one twice creates two Items.
   */
  create(newItem: NewItem): Promise<Item>;

  /** The User's Item with this id, or null when there's none or it's another User's. */
  findById(userId: string, itemId: string): Promise<Item | null>;

  /**
   * Every one of the User's Items, Processing and Failed included, newest first:
   * by creation time, then by id, so two Items created at the same moment keep
   * the same order between calls. Each comes without its Text, which no card
   * shows and which can be long, so the Library never loads every Item's Text.
   */
  listForUser(userId: string): Promise<ItemSummary[]>;
}
