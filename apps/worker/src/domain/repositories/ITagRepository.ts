import type { ItemRef } from "@/domain/entities/Item";

/** The Tags AI tagging reads and writes. The persistence adapter implements it. */
export interface ITagRepository {
  /**
   * The names of the User's Tags (at most `MAX_TAGS_PER_USER`), most recently
   * used first (as the API's `GET /tags`: the latest time the Tag went on an Item,
   * else when it was made, ties by name), leaving out a Tag only the AI used once
   * it's on no Items. `applyAsAi` deletes those before counting, so these are
   * exactly the Tags that count towards the limit.
   */
  listNames(userId: string): Promise<string[]>;
  /** The Tag names the User has taken off this Item (its Rejected tags). */
  listRejectedNames(ref: ItemRef): Promise<string[]>;
  /**
   * Puts these Tags on the User's Item with Tag source `ai`, in one transaction
   * that locks the Item's row, then the User's. First it deletes the User's
   * Tags only the AI used that are on no Items. A name that's one of the User's
   * Tags reuses it, leaving whether the User ever applied it as it was; any
   * other creates a Tag only the AI has used, unless the User is at
   * `MAX_TAGS_PER_USER`, when it's skipped. Names stop once the Item has
   * `MAX_TAGS_PER_ITEM` Tags. A Tag already on the Item, from either source, is
   * left as it is, and so is a name rejected for the Item. Never throws on a
   * limit. Resolves to the names it put on the Item, in the order given, or
   * null when the Item no longer exists (or isn't the User's).
   */
  applyAsAi(ref: ItemRef, names: string[]): Promise<string[] | null>;
}
