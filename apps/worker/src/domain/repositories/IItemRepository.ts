import type { Item, ItemRef, ItemType, ReadyItem, TaggableItem } from "@/domain/entities/Item";

/** The Items Processing reads and finishes. The persistence adapter implements it. */
export interface IItemRepository {
  /** The User's Item, or null if it doesn't exist (or isn't theirs). */
  findById(ref: ItemRef): Promise<Item | null>;
  /** The User's Item as AI tagging sends it to the model, or null if it doesn't exist (or isn't theirs). */
  findTaggable(ref: ItemRef): Promise<TaggableItem | null>;
  /**
   * Marks the User's Item Ready with what Processing learned (Item type, title,
   * description, Thumbnail key and Text), all in one update. False when no row
   * was updated: the Item doesn't exist (it was deleted mid-Processing) or
   * isn't theirs.
   */
  markReady(ref: ItemRef, ready: ReadyItem): Promise<boolean>;
  /** Marks the User's Item Failed with this Item type. */
  markFailed(ref: ItemRef, type: ItemType): Promise<void>;
  /**
   * Up to `limit` of every User's Items still Processing that were saved before
   * `cutoff`, the oldest first.
   */
  findProcessingBefore(cutoff: Date, limit: number): Promise<Item[]>;
  /**
   * Marks the User's Item Failed with this Item type, but only while it is still
   * Processing. False when it wasn't changed: it finished in the meantime, or it
   * doesn't exist (or isn't theirs).
   */
  markFailedIfProcessing(ref: ItemRef, type: ItemType): Promise<boolean>;
}
