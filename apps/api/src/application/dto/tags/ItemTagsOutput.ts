import type { ItemCardTag } from "@resonory/shared/schemas/items";
import type { AppliedTag } from "@/domain/entities/Tag";

/** An Item's Tags, in the Item card's tag shape: what every Tag change on an Item answers with. */
export type ItemTagsOutput = ItemCardTag[];

/** The Item card's tag shape for each applied Tag, keeping their order. */
export function toItemTagsOutput(applied: readonly AppliedTag[]): ItemTagsOutput {
  return applied.map(({ tag, source }) => ({ id: tag.id, name: tag.name, source }));
}
