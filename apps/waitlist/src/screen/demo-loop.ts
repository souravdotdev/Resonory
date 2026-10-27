/*
 * The search demo's loop, as pure functions over a small state: the timing
 * and order of the founder's design, with nothing about timers or React.
 * The loop walks the wall's match sequence, one search per step:
 *
 * 1. type: the query appears a character at a time while Resonory scans,
 *    flickering other cards;
 * 2. match: the card the query finds is lit, its thread drawn, the
 *    Cue shown;
 * 3. out: all of that fades away;
 *
 * and then the next search, wrapping around after the last one.
 */

export type LoopPhase = "type" | "match" | "out";

export type LoopState = {
  /** Which search of the sequence is on, by position. */
  step: number;
  /** How much of its query is typed. */
  chars: number;
  phase: LoopPhase;
};

/** The loop as the page first shows it: the first search, nothing typed yet. */
export const LOOP_START: LoopState = { step: 0, chars: 0, phase: "type" };

/** The design's timings, in milliseconds. */
const TIMING = {
  /** The empty search bar, before the first character. */
  beforeTyping: 550,
  /** Each character takes between these two, at random, like a person typing. */
  keystroke: { min: 55, max: 100 },
  /** From the last character to the match. */
  beforeMatch: 320,
  /** How long the match stays. */
  match: 3600,
  /** How long the match takes to fade away. */
  out: 800,
} as const;

/** `state`'s query: the one its step is on. */
function queryOf(state: LoopState, queries: readonly string[]): string {
  return queries[state.step % queries.length] ?? "";
}

/** How many characters `state`'s query has. */
function queryLength(state: LoopState, queries: readonly string[]): number {
  return queryOf(state, queries).length;
}

/** As much of `state`'s query as is typed. */
export function typedQuery(state: LoopState, queries: readonly string[]): string {
  return queryOf(state, queries).slice(0, state.chars);
}

/** Whether `state`'s query is typed in full. */
export function isQueryTyped(state: LoopState, queries: readonly string[]): boolean {
  return state.chars >= queryLength(state, queries);
}

/**
 * How long the loop stays at `state` before it advances, in milliseconds.
 * `random` returns a number in [0, 1), as `Math.random` does, and spaces the
 * keystrokes.
 */
export function holdFor(
  state: LoopState,
  queries: readonly string[],
  random: () => number,
): number {
  switch (state.phase) {
    case "type": {
      if (state.chars === 0) return TIMING.beforeTyping;
      if (isQueryTyped(state, queries)) return TIMING.beforeMatch;
      const { min, max } = TIMING.keystroke;
      return min + random() * (max - min);
    }
    case "match":
      return TIMING.match;
    case "out":
      return TIMING.out;
  }
}

/** The loop one beat after `state`, over the sequence's `queries` in order. */
export function advance(state: LoopState, queries: readonly string[]): LoopState {
  switch (state.phase) {
    case "type":
      return !isQueryTyped(state, queries)
        ? { ...state, chars: state.chars + 1 }
        : { ...state, phase: "match" };
    case "match":
      return { ...state, phase: "out" };
    case "out":
      return { step: (state.step + 1) % Math.max(1, queries.length), chars: 0, phase: "type" };
  }
}

/** The one frame shown under reduced motion: the first search, fully typed and matched. */
export function stillFrame(queries: readonly string[]): LoopState {
  return { step: 0, chars: queries[0]?.length ?? 0, phase: "match" };
}

/**
 * Which search's card flickers as Resonory scans, by position in the
 * sequence: while the query is part typed, a different one for each third of
 * it, as the design picks them. Never `state`'s own match; null when nothing
 * scans.
 */
export function scanCandidate(state: LoopState, queries: readonly string[]): number | null {
  const length = queryLength(state, queries);
  const count = queries.length;
  if (state.phase !== "type" || state.chars === 0 || state.chars >= length || count < 2) {
    return null;
  }
  const step = state.step % count;
  const third = Math.min(2, Math.floor(state.chars / Math.max(1, length / 3)));
  const position = (step * 5 + third * 7 + 1) % count;
  return position === step ? (position + 1) % count : position;
}
