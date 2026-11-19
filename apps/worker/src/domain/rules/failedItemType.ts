import type { ItemType } from "@/domain/entities/Item";

/**
 * The Item type a Failed Item keeps: the one it already has, or a Link when it
 * never got one, so it still displays like any other Item.
 */
export function failedItemType(type: ItemType | null): ItemType {
  return type ?? "link";
}
