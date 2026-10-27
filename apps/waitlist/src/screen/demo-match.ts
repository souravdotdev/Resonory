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

/** The demo's first example, and the one its still frame shows. */
export const FIRST_MATCH: DemoMatch = {
  query: "agile retrospective ideas",
  title: "Five retro formats your team won’t dread",
  kind: "X post",
  saved: "saved 3 months ago",
};
