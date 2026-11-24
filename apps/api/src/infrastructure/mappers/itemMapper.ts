import type { Item, ItemSummary } from "@/domain/entities/Item";
import type { items } from "@resonory/db/schema";

type ItemRow = Omit<typeof items.$inferSelect, "searchVector">;

// Every field passes through unchanged, dates included; ISO strings are the
// Item card output's job (see ADR 0001). search_vector is a search detail, not part of the Item.
export function toItem(row: ItemRow): Item {
  return { ...toItemSummary(row), extractedText: row.extractedText };
}

/** An Item without its Text, from a row selected without `extracted_text`. */
export function toItemSummary(row: Omit<ItemRow, "extractedText">): ItemSummary {
  return {
    id: row.id,
    userId: row.userId,
    sourceUrl: row.sourceUrl,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    thumbnailKey: row.thumbnailKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
