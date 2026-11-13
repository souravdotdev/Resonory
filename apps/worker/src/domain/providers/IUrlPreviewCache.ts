import type { CachedPreview } from "@/domain/entities/Item";

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
