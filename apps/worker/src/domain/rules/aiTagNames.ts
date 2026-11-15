import { MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import { slugifyTagName } from "@/domain/rules/tagName";

/** The most Tags AI tagging puts on one Item. Fewer, or none, is fine. */
export const MAX_AI_TAGS = 3;

export interface AiTagNamesContext {
  /** Every one of the User's Tag names: exactly those counting towards `MAX_TAGS_PER_USER`. */
  tagNames: readonly string[];
  /** The names the User took off this Item, which the AI never puts back. */
  rejected: readonly string[];
}

/**
 * The Tag names AI tagging puts on an Item, from the model's raw answer: each
 * through the Tag name rule (invalid ones dropped), then deduped, without the
 * Item's Rejected tags and, once the User is at `MAX_TAGS_PER_USER`, without
 * names that would create a Tag. The first `MAX_AI_TAGS` left, in the model's
 * order. Dropping comes before the cap, so a refused name never takes a place.
 */
export function aiTagNames(suggested: readonly string[], context: AiTagNamesContext): string[] {
  const rejected = new Set(context.rejected);
  const existing = new Set(context.tagNames);
  const atUserLimit = existing.size >= MAX_TAGS_PER_USER;
  const names = new Set<string>();
  for (const name of suggested) {
    const result = slugifyTagName(name);
    if (!result.ok || rejected.has(result.slug)) continue;
    if (atUserLimit && !existing.has(result.slug)) continue;
    names.add(result.slug);
    if (names.size === MAX_AI_TAGS) break;
  }
  return [...names];
}
