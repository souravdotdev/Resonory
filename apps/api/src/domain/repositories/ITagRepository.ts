import type { AppliedTag, Tag } from "@/domain/entities/Tag";

/** One of a User's Items and one of their Tags: what a Tag link joins. */
export interface ItemTagRef {
  userId: string;
  itemId: string;
  tagId: string;
}

/** Stores a User's Tags and the Tags on their Items. The persistence adapter implements it. */
export interface ITagRepository {
  /**
   * The User's Tag with this Tag name (an already-slugified name), created if
   * they have none. Two concurrent calls for the same new name end with one Tag.
   * Throws `UserTagLimitError`, creating nothing, when the Tag is new and the
   * User already has `MAX_TAGS_PER_USER`; an existing Tag is always found.
   */
  findOrCreate(userId: string, name: string): Promise<Tag>;

  /**
   * Puts the Tag on the Item with Tag source `user`. A link the AI made becomes
   * the User's; a link the User already made is left as it is. Throws
   * `ItemTagLimitError`, linking nothing, when the Tag isn't on the Item yet and
   * the Item already has `MAX_TAGS_PER_ITEM` (the AI's count too).
   */
  applyAsUser(ref: ItemTagRef): Promise<void>;

  /** The Tags on one of the User's Items, each with its Tag source, oldest link first. */
  listOnItem(userId: string, itemId: string): Promise<AppliedTag[]>;
}
