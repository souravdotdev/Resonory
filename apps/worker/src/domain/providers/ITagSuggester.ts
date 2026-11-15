import type { TaggableItem } from "@/domain/entities/Item";

/**
 * What the model is told about one Item, and nothing more (Items ADR 0004):
 * the Item's excerpt, plus the names of every one of its User's Tags so it
 * can reuse one instead of inventing a near-duplicate.
 */
export interface TagSuggestionRequest extends TaggableItem {
  tagNames: string[];
}

/**
 * Asks a language model which Tags fit an Item. The OpenAI-compatible adapter
 * implements it. Its answer is raw: names the model wrote, unchecked against
 * the Tag name rule, possibly repeated, possibly more than AI tagging keeps.
 * Any failure (unreachable, rate-limited, an answer that isn't the expected
 * JSON) throws, so the job is retried.
 */
export interface ITagSuggester {
  suggestTags(request: TagSuggestionRequest): Promise<string[]>;
}
