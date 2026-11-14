import { MAX_TAGS_PER_ITEM } from "@/domain/rules/tagLimits";
import { AppError } from "./AppError";

/** Putting another Tag on an Item would take it past `MAX_TAGS_PER_ITEM`. */
export class ItemTagLimitError extends AppError {
  constructor(readonly itemId: string) {
    super(`Item ${itemId} already has ${MAX_TAGS_PER_ITEM} Tags`, "ITEM_TAG_LIMIT");
  }
}
