import { KIND_LABEL, PROMISED_SAVES, type Save } from "./wall/saves";

/**
 * One step of the search demo: a query typed in the browser, and the
 * forgotten save it finds. The query and the title share a meaning, never the
 * same words, so the demo shows matching by meaning rather than keywords.
 */
export type DemoMatch = {
  /** What the visitor "types" into the search bar. */
  query: string;
  /** The save's title, as on its card and in the notification. */
  title: string;
  /** What kind of save it is, as the notification names it ("X post"). */
  kind: string;
  /** When it was saved, as the notification says it ("saved 3 months ago"). */
  saved: string;
};

/** The demo step that finds `save`. */
export function demoMatchFor(save: Save): DemoMatch {
  return { query: save.query, title: save.title, kind: KIND_LABEL[save.kind], saved: save.saved };
}

/** The demo's first example, and the one its still frame shows. */
export const FIRST_MATCH: DemoMatch = demoMatchFor(PROMISED_SAVES[0]);
