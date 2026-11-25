/**
 * Where an Item's Thumbnail is kept, inside the `thumbnails` bucket: one object
 * per Item, in its User's folder. It mirrors the worker's rule of the same name,
 * which stores the object there; each app owns its own copy (ADR 0004).
 */
export function thumbnailKeyOf({ userId, itemId }: { userId: string; itemId: string }): string {
  return `${userId}/${itemId}.webp`;
}
