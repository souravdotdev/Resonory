/**
 * Tagged, with the names the model answered (raw) and the ones put on the
 * Item, possibly none; unconfigured: no model is set up, so nothing was asked;
 * or missing: the Item was deleted (or isn't the User's), so there's nothing to tag.
 */
export type TagItemResult =
  | { outcome: "tagged"; suggested: string[]; applied: string[] }
  | { outcome: "unconfigured" }
  | { outcome: "missing" };
