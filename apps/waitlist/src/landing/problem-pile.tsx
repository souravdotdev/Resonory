"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { watchViewport } from "@/motion/viewport";
import { GlyphTile, ITEM_GLYPHS, Meta, type ItemKind } from "./palette";

/**
 * The problem section's picture: a pile of saves, newest on top, each older
 * one lower down and further gone. The pile starts out bright and, the first
 * time it is wholly in view (on load too, when it starts that way), fades
 * and sinks, oldest first, triggered by the shared viewport observer. Under
 * reduced motion it is the faded pile from the start, still.
 *
 * Decorative: the section's text already says the same thing.
 */

type PileCard = {
  kind: ItemKind;
  title: string;
  meta: string;
  /** Where the card lies in the pile: its nudge across, as a percentage, and its tilt. */
  x: number;
  tilt: number;
  /** How much of the card is left once it has faded. */
  fade: number;
};

const PILE: PileCard[] = [
  {
    kind: "post",
    title: "A thread on naming things in code",
    meta: "X post · saved 6 weeks ago",
    x: 6,
    tilt: -1.5,
    fade: 0.85,
  },
  {
    kind: "link",
    title: "Packing list for a week by the sea",
    meta: "Link · saved 2 months ago",
    x: 14,
    tilt: 1.5,
    fade: 0.6,
  },
  {
    kind: "pdf",
    title: "Q3 pricing teardown.pdf",
    meta: "PDF · saved 3 months ago",
    x: 2,
    tilt: -1,
    fade: 0.45,
  },
  {
    kind: "video",
    title: "Sourdough at home, start to finish",
    meta: "Video · saved 5 months ago",
    x: 12,
    tilt: 2,
    fade: 0.32,
  },
  {
    kind: "image",
    title: "Small balcony garden ideas",
    meta: "Post · saved 7 months ago",
    x: 4,
    tilt: -2,
    fade: 0.2,
  },
  {
    kind: "article",
    title: "How to write a design doc people read",
    meta: "Article · saved 8 months ago",
    x: 10,
    tilt: 1,
    fade: 0.12,
  },
];

/** Each card sits this far below the one before it, in rem. */
const STEP = 3.25;

export function ProblemIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  // Watched instead of the pile itself, so the fade waits until the whole pile is on screen.
  const bottom = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !bottom.current) return;
    const stop = watchViewport(bottom.current, (inView) => {
      if (!inView) return;
      element.dataset.play = "faded";
      stop();
    });
    return stop;
  }, []);

  return (
    <div
      ref={ref}
      data-slot="problem-illustration"
      aria-hidden="true"
      className="group/play flex w-full flex-col gap-4"
    >
      <Meta className="px-2">Saved for later · never opened</Meta>
      <div className="relative w-full" style={{ height: `${(PILE.length - 1) * STEP + 4}rem` }}>
        <span ref={bottom} className="absolute inset-x-0 bottom-0 h-px" />
        {PILE.map((card, index) => {
          const fromOldest = PILE.length - 1 - index;
          return (
            <div
              key={card.title}
              className="absolute w-5/6"
              style={{
                top: `${index * STEP}rem`,
                left: `${card.x}%`,
                zIndex: PILE.length - index,
                rotate: `${card.tilt}deg`,
                scale: `${1 - index * 0.02}`,
              }}
            >
              <div
                className="flex items-center gap-3 rounded-xl border border-hairline bg-card px-3 py-3 shadow-palette transition-[opacity,translate] duration-[1400ms] ease-spring group-data-[play=faded]/play:translate-y-(--sink) group-data-[play=faded]/play:opacity-(--fade) motion-reduce:translate-y-(--sink) motion-reduce:opacity-(--fade) motion-reduce:transition-none"
                style={
                  {
                    "--fade": card.fade,
                    "--sink": `${0.25 + index * 0.25}rem`,
                    transitionDelay: `${500 + fromOldest * 160}ms`,
                  } as CSSProperties
                }
              >
                <GlyphTile icon={ITEM_GLYPHS[card.kind]} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-text">{card.title}</span>
                  <Meta className="truncate">{card.meta}</Meta>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
