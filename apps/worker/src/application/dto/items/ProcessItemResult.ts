import type { ReadyItem } from "@/domain/entities/Item";

/**
 * Ready with what Processing learned (Item type, title, description,
 * Thumbnail key and Text), or missing: the Item was deleted (or isn't the
 * User's), so there's nothing to do. A Ready result carries `textError` only
 * when the Text extractor threw: the Item is Ready without that Text all the
 * same, and the processor logs the failure (the use case itself never logs).
 */
export type ProcessItemResult =
  ({ outcome: "ready"; textError?: unknown } & ReadyItem) | { outcome: "missing" };
