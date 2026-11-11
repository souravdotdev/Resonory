import type { ReadyItem } from "@/domain/entities/Item";

/**
 * Ready with what Processing learned (Item type, title, description,
 * Thumbnail key and Text), or missing: the Item was deleted (or isn't the User's), so
 * there's nothing to do.
 */
export type ProcessItemResult = ({ outcome: "ready" } & ReadyItem) | { outcome: "missing" };
