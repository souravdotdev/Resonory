import type { ItemRef } from "@/domain/entities/Item";

/**
 * Where an Item's Thumbnail is kept, inside the `thumbnails` bucket: one
 * object per Item, in its User's folder. Only a later Processing run of that
 * same Item overwrites it, so no other Item's save ever changes its picture.
 */
export function thumbnailKeyOf({ userId, itemId }: Pick<ItemRef, "userId" | "itemId">): string {
  return `${userId}/${itemId}.webp`;
}
