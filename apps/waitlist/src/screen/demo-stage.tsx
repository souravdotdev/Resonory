"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { scanCandidate } from "./demo-loop";
import { demoMatchFor, type DemoMatch } from "./demo-match";
import { useDemoLoop } from "./use-demo-loop";
import { PROMISED_SAVES, type Save } from "./wall/saves";

/** A card the demo can find: its id on the wall, and its save. */
export type DemoEntry = { cardId: string; save: Save };

/** What the demo shows at this moment, the same for the search demo and the wall. */
export type DemoView = {
  /** The search on now, and the card it finds. */
  cardId: string;
  match: DemoMatch;
  /** How much of the query is in the search bar. */
  typed: string;
  /** The query is complete, so the browser shows results. */
  searched: boolean;
  /** The match is on: its card lit, its thread drawn, the notification shown. */
  matched: boolean;
  /** The card flickering as Resonory scans, never the match's own. */
  scanningCardId: string | null;
};

type DemoStageValue = {
  view: DemoView;
  /** The wall gives its match sequence once it's laid out. */
  setSequence: (sequence: readonly DemoEntry[]) => void;
};

const DemoStageContext = createContext<DemoStageValue | null>(null);

/**
 * Until the wall is laid out, the demo searches for the promised saves; the
 * wall's sequence starts with the same one, so nothing jumps when it arrives.
 */
const BEFORE_LAYOUT: readonly DemoEntry[] = PROMISED_SAVES.map((save, i) => ({
  cardId: `promised-${i}`,
  save,
}));

/**
 * Runs the one demo loop for everything inside it: the search demo types and
 * the wall lights the card it finds, from the same state, so the lit card,
 * the notification and the thread always agree.
 */
export function DemoStage({ children }: { children: ReactNode }) {
  const [sequence, setSequence] = useState(BEFORE_LAYOUT);
  const queries = useMemo(() => sequence.map((entry) => entry.save.query), [sequence]);
  const loop = useDemoLoop(queries);

  const value = useMemo((): DemoStageValue => {
    const entry = sequence[loop.step % sequence.length]!;
    const scan = scanCandidate(loop, queries);
    return {
      view: {
        cardId: entry.cardId,
        match: demoMatchFor(entry.save),
        typed: entry.save.query.slice(0, loop.chars),
        searched: loop.chars >= entry.save.query.length,
        matched: loop.phase === "match",
        scanningCardId: scan === null ? null : sequence[scan]!.cardId,
      },
      setSequence,
    };
  }, [loop, queries, sequence]);

  return <DemoStageContext value={value}>{children}</DemoStageContext>;
}

function useDemoStage(): DemoStageValue {
  const value = use(DemoStageContext);
  if (!value) throw new Error("The search demo and the card wall belong inside a DemoStage.");
  return value;
}

/** What the demo shows now. */
export function useDemoView(): DemoView {
  return useDemoStage().view;
}

/** How the wall hands the demo its match sequence. */
export function useSetDemoSequence(): DemoStageValue["setSequence"] {
  return useDemoStage().setSequence;
}
