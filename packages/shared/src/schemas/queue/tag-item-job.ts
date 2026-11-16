import { z } from "zod";

/**
 * The BullMQ queue Tag Item jobs wait on. The processing worker produces onto it
 * once an Item is Ready; the tagging worker consumes it.
 */
export const ITEM_TAGGING_QUEUE = "item-tagging";

/** The job that runs an Item's AI tagging, on the Item tagging queue. */
export const TAG_ITEM_JOB = "tag-item";

/**
 * A Tag Item job's payload: which Item, and whose. Only ids travel through
 * Redis; the worker loads the Item, its Text and the User's Tags itself.
 */
export const TagItemJobSchema = z.object({
  itemId: z.uuid(),
  userId: z.uuid(),
});

export type TagItemJob = z.infer<typeof TagItemJobSchema>;
