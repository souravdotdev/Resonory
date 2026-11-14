import type { ListTagsResponse } from "@resonory/shared/schemas/items";
import type { Tag } from "@/domain/entities/Tag";

/** The User's Tags, as `GET /tags` answers with them. */
export type ListTagsOutput = ListTagsResponse;

/** Each Tag's id and Tag name, keeping their order. The owner and dates stay internal. */
export function toListTagsOutput(tags: readonly Tag[]): ListTagsOutput {
  return tags.map(({ id, name }) => ({ id, name }));
}
