import { z } from "zod";
import { ItemCardTagSchema } from "./item-card";

/** The Item whose Tags a request reads or changes (`/items/:itemId/tags`). */
export const ItemTagParamsSchema = z.object({
  itemId: z.uuid(),
});

export type ItemTagParams = z.infer<typeof ItemTagParamsSchema>;

/**
 * Tag an Item by name (`POST /items/:itemId/tags`). The name is sent as the User
 * typed it: the API reduces it to its Tag name (the slug), and refuses one that's
 * empty or too long once reduced, so that rule lives in one place.
 */
export const TagItemSchema = z.object({
  name: z.string(),
});

export type TagItemInput = z.infer<typeof TagItemSchema>;

/** An Item's Tags after a change, in the Item card's tag shape. */
export const ItemTagsResponseSchema = z.array(ItemCardTagSchema);

export type ItemTagsResponse = z.infer<typeof ItemTagsResponseSchema>;

/** The Tag to take off an Item (`DELETE /items/:itemId/tags/:tagId`). */
export const UntagItemParamsSchema = ItemTagParamsSchema.extend({
  tagId: z.uuid(),
});

export type UntagItemParams = z.infer<typeof UntagItemParamsSchema>;
