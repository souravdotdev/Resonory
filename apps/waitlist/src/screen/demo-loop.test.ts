import { describe, expect, it } from "vitest";
import {
  advance,
  holdFor,
  isQueryTyped,
  LOOP_START,
  scanCandidate,
  stillFrame,
  typedQuery,
  type LoopState,
} from "./demo-loop";

/** Three searches, short enough to walk through by hand. */
const QUERIES = ["abc", "de", "fghi"];

/** `from` and the states the loop passes through in the next `beats` beats. */
function run(from: LoopState, queries: readonly string[], beats: number): LoopState[] {
  const states = [from];
  for (let i = 0; i < beats; i++) states.push(advance(states.at(-1)!, queries));
  return states;
}

describe("demo loop", () => {
  it("types the query a character at a time, then matches, then goes out, then moves on", () => {
    expect(run(LOOP_START, QUERIES, 6)).toEqual([
      { step: 0, chars: 0, phase: "type" },
      { step: 0, chars: 1, phase: "type" },
      { step: 0, chars: 2, phase: "type" },
      { step: 0, chars: 3, phase: "type" },
      { step: 0, chars: 3, phase: "match" },
      { step: 0, chars: 3, phase: "out" },
      { step: 1, chars: 0, phase: "type" },
    ]);
  });

  it("shows as much of the step's query as is typed, and knows when it's complete", () => {
    const partly: LoopState = { step: 2, chars: 2, phase: "type" };
    const fully: LoopState = { step: 2, chars: 4, phase: "type" };

    expect(typedQuery(partly, QUERIES)).toBe("fg");
    expect(isQueryTyped(partly, QUERIES)).toBe(false);
    expect(typedQuery(fully, QUERIES)).toBe("fghi");
    expect(isQueryTyped(fully, QUERIES)).toBe(true);
  });

  it("wraps around to the first search after the last one", () => {
    const lastOut: LoopState = { step: 2, chars: 4, phase: "out" };

    expect(advance(lastOut, QUERIES)).toEqual({ step: 0, chars: 0, phase: "type" });
  });

  it("pauses before typing, then waits 55–100ms per character", () => {
    expect(holdFor(LOOP_START, QUERIES, () => 0)).toBe(550);
    const typing: LoopState = { step: 0, chars: 1, phase: "type" };
    expect(holdFor(typing, QUERIES, () => 0)).toBe(55);
    expect(holdFor(typing, QUERIES, () => 0.5)).toBe(77.5);
    expect(holdFor(typing, QUERIES, () => 0.9999)).toBeLessThan(100);
  });

  it("matches 320ms after the last character, holds the match 3.6s and goes out over 800ms", () => {
    const random = () => 0.5;

    expect(holdFor({ step: 0, chars: 3, phase: "type" }, QUERIES, random)).toBe(320);
    expect(holdFor({ step: 0, chars: 3, phase: "match" }, QUERIES, random)).toBe(3600);
    expect(holdFor({ step: 0, chars: 3, phase: "out" }, QUERIES, random)).toBe(800);
  });

  it("holds its still frame on the first search, fully typed and matched", () => {
    expect(stillFrame(QUERIES)).toEqual({ step: 0, chars: 3, phase: "match" });
  });

  describe("scan candidate", () => {
    const longQueries = ["agile retrospective ideas", "how to price", "sourdough", "tokens", "ci"];

    it("never flickers the search's own match, through every step of a whole cycle", () => {
      for (const queries of [longQueries, longQueries.slice(0, 2), longQueries.slice(0, 3)]) {
        const states = run(LOOP_START, queries, 200);
        for (const state of states) {
          const candidate = scanCandidate(state, queries);
          if (candidate !== null) expect(candidate).not.toBe(state.step);
        }
      }
    });

    it("flickers some other card while the query is part typed", () => {
      const states = run(LOOP_START, longQueries, longQueries[0]!.length).slice(1, -1);

      const candidates = states.map((state) => scanCandidate(state, longQueries));
      expect(candidates.every((candidate) => candidate !== null)).toBe(true);
      expect(new Set(candidates).size).toBeGreaterThan(1);
    });

    it("rests before typing starts, once the query is complete, and while matched", () => {
      const queries = longQueries;
      const full = queries[0]!.length;

      expect(scanCandidate(LOOP_START, queries)).toBeNull();
      expect(scanCandidate({ step: 0, chars: full, phase: "type" }, queries)).toBeNull();
      expect(scanCandidate({ step: 0, chars: full, phase: "match" }, queries)).toBeNull();
      expect(scanCandidate({ step: 0, chars: full, phase: "out" }, queries)).toBeNull();
    });

    it("has nothing to flicker when there is only one search", () => {
      expect(scanCandidate({ step: 0, chars: 1, phase: "type" }, ["abc"])).toBeNull();
    });
  });
});
