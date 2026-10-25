"use client";

import { Fragment, useLayoutEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion, watchViewport } from "@/motion/viewport";
import { DriftCard, type DriftItem } from "./drift-cards";
import "./drift-layer.css";

/**
 * The ambient layer: small saved things and Cue cards drifting in the page's
 * margins, joined by memory threads that draw as each group scrolls into view.
 *
 * Groups sit only in the gutters outside the page's text column, so nothing
 * ever floats behind copy or a form. Where the gutters are too narrow to hold
 * a card (below 1440px wide, phones included) the layer shows nothing.
 *
 * Motion runs off the shared viewport observer: a group's thread draws the
 * first time it enters the screen, and its drift pauses whenever it is off
 * screen. Under reduced motion nothing drifts and every thread is drawn.
 */

type Group = {
  side: "left" | "right";
  /** How far down the page the group sits, as a share of its height. */
  top: string;
  /** How strongly the group shows; the farther from the hero, the quieter. */
  opacity: number;
  items: DriftItem[];
};

const GROUPS: Group[] = [
  {
    side: "left",
    top: "3%",
    opacity: 0.8,
    items: [
      { kind: "post", label: "X post", title: "Five retro formats your team won’t dread" },
      { kind: "video", label: "Video", title: "Agile principles, explained" },
      { kind: "cue", text: "3 saves on retros" },
    ],
  },
  {
    side: "right",
    top: "6%",
    opacity: 0.7,
    items: [
      { kind: "article", label: "Article", title: "Running a blameless retrospective" },
      { kind: "pdf", label: "PDF", title: "retro-template.pdf" },
    ],
  },
  {
    side: "left",
    top: "22%",
    opacity: 0.6,
    items: [
      { kind: "image", label: "Instagram", title: "Sourdough crumb, day three" },
      { kind: "link", label: "Link", title: "breadnotes.page/starter" },
    ],
  },
  {
    side: "right",
    top: "33%",
    opacity: 0.6,
    items: [
      { kind: "article", label: "Article", title: "How to write a design doc people read" },
      { kind: "pdf", label: "PDF", title: "design-doc-outline.pdf" },
      { kind: "cue", text: "2 saves on design docs" },
    ],
  },
  {
    side: "left",
    top: "50%",
    opacity: 0.55,
    items: [
      { kind: "post", label: "X post", title: "A thread on naming things in code" },
      { kind: "video", label: "Video", title: "Clean code, a talk" },
    ],
  },
  {
    side: "right",
    top: "63%",
    opacity: 0.55,
    items: [
      { kind: "link", label: "Link", title: "pricingpages.club/teardowns" },
      { kind: "post", label: "X post", title: "Why we killed our free plan" },
      { kind: "cue", text: "4 saves on pricing" },
    ],
  },
  {
    side: "left",
    top: "78%",
    opacity: 0.5,
    items: [
      { kind: "image", label: "Instagram", title: "Lisbon at golden hour" },
      { kind: "article", label: "Article", title: "Three days in Lisbon" },
    ],
  },
];

/**
 * Each card's slow drift: how far it travels (in px), over how long (s),
 * and where in that journey it starts, so no two cards move in step.
 */
const DRIFTS = [
  { x: 6, y: -10, duration: 19, delay: -4 },
  { x: -5, y: 8, duration: 23, delay: -11 },
  { x: 4, y: -7, duration: 27, delay: -17 },
  { x: -7, y: -6, duration: 21, delay: -8 },
] as const;

/** Small steps left and right, so a group's cards don't stand in a rigid column. */
const SWAY = ["-0.5rem", "0.5rem", "0rem"] as const;

function driftStyle(index: number): CSSProperties {
  const drift = DRIFTS[index % DRIFTS.length]!;
  return {
    "--drift-x": `${drift.x}px`,
    "--drift-y": `${drift.y}px`,
    "--drift-duration": `${drift.duration}s`,
    "--drift-delay": `${drift.delay}s`,
  } as CSSProperties;
}

function DriftGroup({ group, index, still }: { group: Group; index: number; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || still) return;

    // Hold the thread back before the first paint, then draw it the first
    // time the group is on screen. Drift only runs while it is.
    element.dataset.thread = "waiting";
    return watchViewport(element, (inView) => {
      if (inView) {
        element.dataset.thread = "drawn";
        element.dataset.active = "";
      } else {
        delete element.dataset.active;
      }
    });
  }, [still]);

  const placement = group.side === "left" ? "right-[calc(50%+38rem)]" : "left-[calc(50%+38rem)]";

  return (
    <div
      ref={ref}
      data-drift-group
      className={`absolute w-24 ${placement}`}
      style={{ top: group.top, opacity: group.opacity }}
    >
      {/* The memory thread, behind the cards: they cover its ends. */}
      <span data-thread-line className="absolute top-8 bottom-8 left-1/2 w-px bg-border" />
      <div className="relative flex flex-col items-center">
        {group.items.map((item, itemIndex) => (
          <Fragment key={itemIndex}>
            {itemIndex > 0 && (
              <span
                data-thread-node
                className="my-3 size-1.5 rounded-full bg-muted/60"
                style={{ "--node-delay": `${itemIndex * 400}ms` } as CSSProperties}
              />
            )}
            <div
              className="w-full"
              {...(still ? {} : { "data-drift": "" })}
              style={{
                ...driftStyle(index + itemIndex),
                translate: `${SWAY[(index + itemIndex) % SWAY.length]} 0`,
              }}
            >
              <DriftCard item={item} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** The ambient layer of drifting saved things. Decorative and never focusable. */
export function DriftLayer() {
  const still = useReducedMotion();
  return (
    <div
      data-slot="drift-layer"
      aria-hidden="true"
      inert
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <div className="hidden min-[90rem]:contents">
        {GROUPS.map((group, index) => (
          <DriftGroup key={index} group={group} index={index} still={still} />
        ))}
      </div>
    </div>
  );
}
