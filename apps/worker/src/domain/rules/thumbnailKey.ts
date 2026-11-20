import { sha256Hex } from "@/domain/rules/sha256Hex";

/**
 * Where a URL's Thumbnail is kept, inside the `thumbnails` bucket: one fixed
 * path per canonical URL, shared by every Item that saves it. Every upload to
 * it overwrites the last one, so all those Items show the latest upload.
 */
export function thumbnailKeyOf(canonicalUrl: string): string {
  return `shared/${sha256Hex(canonicalUrl)}.webp`;
}
