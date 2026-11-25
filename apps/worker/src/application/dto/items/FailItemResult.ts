import type { ItemType } from "@/domain/entities/Item";

/**
 * Failed with the Item type it keeps, or missing: the Item was deleted (or
 * isn't the User's). A missing result carries `orphanedThumbnail` (its key and
 * the delete's error) only when the object at the Item's Thumbnail key couldn't
 * be deleted: the processor logs it, so the orphan can be cleaned up later.
 */
export type FailItemResult =
  | { outcome: "failed"; type: ItemType }
  | { outcome: "missing"; orphanedThumbnail?: { key: string; error: unknown } };
