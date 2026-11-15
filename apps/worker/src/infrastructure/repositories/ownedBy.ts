import { and, eq } from "drizzle-orm";
import { items } from "@resonory/db/schema";
import type { ItemRef } from "@/domain/entities/Item";

/**
 * The one Item with this id, and only if it's this User's: how every worker
 * repository finds, changes or locks an Item's row.
 */
export function ownedBy({ itemId, userId }: ItemRef) {
  return and(eq(items.id, itemId), eq(items.userId, userId));
}
