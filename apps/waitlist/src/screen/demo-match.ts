import { CARD_STYLE_LABEL, savedLabel, type DemoItem } from "./wall/items";

/**
 * One step of the search demo: a query typed in the browser, and the
 * forgotten Item it finds. The query and the title share a meaning, never the
 * same words, so the demo shows matching by meaning rather than keywords.
 */
export type DemoMatch = {
  /** What the visitor "types" into the search bar. */
  query: string;
  /** The Item's title, as on its card and in the Cue. */
  title: string;
  /** How the Cue names the Item's card style ("X post"). */
  label: string;
  /** When it was saved, as the Cue says it ("saved 3 months ago"). */
  saved: string;
};

/** The demo step that finds `item`. */
export function demoMatchFor(item: DemoItem): DemoMatch {
  return {
    query: item.query,
    title: item.title,
    label: CARD_STYLE_LABEL[item.style],
    saved: savedLabel(item),
  };
}
