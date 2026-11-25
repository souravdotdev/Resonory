import { z } from "zod";

/** The Item a request deletes (`DELETE /items/:itemId`). */
export const DeleteItemParamsSchema = z.object({
  itemId: z.uuid(),
});

export type DeleteItemParams = z.infer<typeof DeleteItemParamsSchema>;
