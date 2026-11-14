import { z } from "zod";

/** One of the User's Tags, as a Tag picker offers it. Its name is the Tag name (the slug). */
export const ListedTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type ListedTag = z.infer<typeof ListedTagSchema>;

/**
 * Every one of the User's Tags (`GET /tags`), most recently used first. Matching
 * what the User types is the client's job, so there's no search parameter.
 */
export const ListTagsResponseSchema = z.array(ListedTagSchema);

export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
