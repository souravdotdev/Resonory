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
   */
  findOrCreate(userId: string, name: string): Promise<Tag>;

  /**
   * Puts the Tag on the Item with Tag source `user`. A link the AI made becomes
   * the User's; a link the User already made is left as it is.
   */
  applyAsUser(ref: ItemTagRef): Promise<void>;

  /** The Tags on one of the User's Items, each with its Tag source, oldest link first. */
  listOnItem(userId: string, itemId: string): Promise<AppliedTag[]>;

  /**
   * Every one of the User's Tags, most recently used first: by the latest time it
   * was put on any Item, by the AI or the User, or, on no Items, when it was created.
   */
  listForUser(userId: string): Promise<Tag[]>;
}
