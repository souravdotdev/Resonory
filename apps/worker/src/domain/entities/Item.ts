// The same Item types and statuses as the API's Items domain and the database
// enums; tests/unit/domain/schema-agreement.test.ts keeps them in step.
export const ITEM_TYPES = [
  "article",
  "post",
  "video",
  "image",
  "audio",
  "pdf",
  "code",
  "file",
  "link",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_STATUSES = ["processing", "ready", "failed"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Which Item, and whose: every Item the worker reads or changes is scoped to its User. */
export interface ItemRef {
  itemId: string;
  userId: string;
  /**
   * Already-rendered page content (issue #143/#145), captured by the
   * browser extension and carried on the job unchanged. When present,
   * `ProcessItemUseCase` builds its page representation from it directly
   * and never calls the network fetcher for this job.
   */
  html?: string;
  /**
   * A video's plain caption text (issue #164), read by the extension from
   * the YouTube tab and carried on the job unchanged. When present alongside
   * `html`, it is the Item's Text ahead of anything extracted from `html`;
   * without `html` it is ignored (Text comes only from captured content).
   */
  captions?: string;
}

/** What Processing needs to know about an Item. */
export interface Item {
  id: string;
  userId: string;
  sourceUrl: string;
  // Null only while the Item is Processing.
  type: ItemType | null;
  status: ItemStatus;
}

/** What the page says it is called and is about; written to the Item when it becomes Ready. */
export interface ItemMetadata {
  title: string | null;
  description: string | null;
}

/** No title and no description: the page couldn't be read, or said nothing. */
export const NO_METADATA: ItemMetadata = { title: null, description: null };

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
 * What Processing learned about an Item, written to it in one update when it
 * becomes Ready: the URL's preview (its Item type, title and description, and
 * its Thumbnail key, null without a Thumbnail) plus this Item's own Text (null
 * without one). Text is the User's own, from what their browser captured, so
 * it's never part of the preview every User saving the URL shares (Items ADR
 * 0003): a `CachedPreview` can't carry it.
 */
export interface ReadyItem extends CachedPreview {
  text: string | null;
}
