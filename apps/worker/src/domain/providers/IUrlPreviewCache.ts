import type { ItemMetadata, ItemType } from "@/domain/entities/Item";

/**
 * What Processing decided for a URL, worth reusing for every later Item that
 * saves the same one: its Item type, its title and description, and its
 * Thumbnail key — explicitly including `null` when there is no Thumbnail, so
 * a page confirmed to offer none isn't retried on every save.
 */
export interface CachedPreview {
  type: ItemType;
  metadata: ItemMetadata;
  thumbnailKey: string | null;
}

/**
 * Processing's result for a canonical URL, shared across every User and
 * Item that saves it, so the oEmbed call and the Thumbnail download/resize/
 * upload only ever happen once while an entry is live. A miss (or a cache
 * that's unreachable) is never fatal to Processing: the caller falls back to
 * computing the answer fresh, same as a failed oEmbed call or Thumbnail
 * candidate already does.
 */
export interface IUrlPreviewCache {
  get(canonicalUrl: string): Promise<CachedPreview | null>;
  set(canonicalUrl: string, preview: CachedPreview): Promise<void>;
}
