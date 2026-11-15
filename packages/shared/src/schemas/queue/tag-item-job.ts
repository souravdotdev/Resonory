import { z } from "zod";

/**
 * The job that runs an Item's AI tagging, on the Items queue. The worker queues
 * it once Processing has marked the Item Ready, and consumes it itself.
 */
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
