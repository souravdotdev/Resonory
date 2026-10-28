/*
 * How the screen tells the card wall what to lay itself out around. The
 * wall measures every element carrying one of these attributes; spread them
 * onto the element (`<header {...KEEP_CLEAR}>`).
 */

/** Something the wall never sits behind: the copy and form, the nav, the footer. */
export const KEEP_CLEAR = { "data-wall-keep-clear": "" } as const;

/** The search demo: kept clear too, and the threads run behind it. */
export const WALL_DEMO = { "data-wall-demo": "" } as const;

/** The demo's Resonory extension icon, where a thread starts. */
export const WALL_ANCHOR = { "data-wall-anchor": "" } as const;
