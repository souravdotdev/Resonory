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
   * they have none. Either way it's the User's from now on (origin `user`), so
   * a Tag only the AI had used is no longer deleted once it's on no Items.
   * Two concurrent calls for the same new name end with one Tag.
   * Throws `UserTagLimitError`, creating nothing, when the Tag is new and the
   * User already has `MAX_TAGS_PER_USER`; an existing Tag is always found.
   * Before counting, it deletes the User's Tags only the AI used that are on no
   * Items (their Items deleted), so those never count towards the limit.
   */
  findOrCreate(userId: string, name: string): Promise<Tag>;

  /**
   * Puts the Tag on the Item with Tag source `user`. A link the AI made becomes
   * the User's; a link the User already made is left as it is. The Tag becomes
   * the User's (origin `user`) for good. Throws
   * `ItemTagLimitError`, linking nothing, when the Tag isn't on the Item yet and
   * the Item already has `MAX_TAGS_PER_ITEM` (the AI's count too). Throws
   * `NotFoundError`, linking nothing, when the Item is no longer the User's
   * (deleted since the caller found it).
   */
  applyAsUser(ref: ItemTagRef): Promise<void>;

  /** The Tags on one of the User's Items, each with its Tag source, oldest link first. */
  listOnItem(userId: string, itemId: string): Promise<AppliedTag[]>;

  /**
   * The Tags on several of the User's Items in one query, keyed by Item id, each
   * Item's in `listOnItem`'s order. Every Item id asked for has an entry, `[]`
   * when it has no Tags; another User's Tags never appear. No Item ids, no query.
   */
  listOnItems(userId: string, itemIds: readonly string[]): Promise<Map<string, AppliedTag[]>>;

  /**
   * Every one of the User's Tags, most recently used first: by the latest time it
   * was put on any Item, by the AI or the User, or, on no Items, when it was created.
   * A Tag only the AI used is left out once it's on no Items: one left there by
   * its Items' deletion lingers until the User's next Tag is created.
   */
  listForUser(userId: string): Promise<Tag[]>;

  /** One of the User's Tags, or `null` when it doesn't exist or is another User's. */
  findById(userId: string, tagId: string): Promise<Tag | null>;

  /**
   * Takes the Tag off the Item, whatever its Tag source, and records its Tag name
   * as a Rejected tag for the Item, all at once. A Tag the User ever applied is
   * kept; one only the AI used is deleted with its last link, in the same
   * transaction, and its Rejected tag stays. A name already rejected for the
   * Item stays one Rejected tag. No link is a no-op, recording nothing.
   */
  removeFromItem(ref: ItemTagRef): Promise<void>;
}
