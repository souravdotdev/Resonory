import type { ItemRef } from "@/domain/entities/Item";

/** The Tags AI tagging reads and writes. The persistence adapter implements it. */
export interface ITagRepository {
  /** The names of every one of the User's Tags (at most `MAX_TAGS_PER_USER`). */
  listNames(userId: string): Promise<string[]>;
  /** The Tag names the User has taken off this Item (its Rejected tags). */
  listRejectedNames(ref: ItemRef): Promise<string[]>;
  /**
   * Puts these Tags on the User's Item with Tag source `ai`, in one transaction
   * that locks the Item's row, then the User's. A name that's one of the User's
   * Tags reuses it; any other creates a Tag, unless the User is at
   * `MAX_TAGS_PER_USER`, when it's skipped. Names stop once the Item has
   * `MAX_TAGS_PER_ITEM` Tags. A Tag already on the Item, from either source, is
   * left as it is, and so is a name rejected for the Item. Never throws on a
   * limit. Resolves to the names it put on the Item, in the order given, or
   * null when the Item no longer exists (or isn't the User's).
   */
  applyAsAi(ref: ItemRef, names: string[]): Promise<string[] | null>;
}
