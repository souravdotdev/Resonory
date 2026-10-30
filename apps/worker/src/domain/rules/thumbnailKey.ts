import { sha256Hex } from "@/domain/rules/sha256Hex";

/**
 * Where a URL's Thumbnail is kept, inside the `thumbnails` bucket: one fixed
 * path per canonical URL, shared by every Item that saves it, so only the
 * first upload ever happens and every later Item just points at it.
 */
export function thumbnailKeyOf(canonicalUrl: string): string {
  return `shared/${sha256Hex(canonicalUrl)}.webp`;
}
