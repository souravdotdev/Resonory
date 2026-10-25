"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { LogoSymbol } from "@/app/logo";
import { brandColors } from "@/brand/colors";
import { SYMBOL_BARS_PATH, SYMBOL_DOT_PATH, SYMBOL_VIEW_BOX } from "@/brand/logo";
import { useInViewport, useReducedMotion } from "@/motion/viewport";
import { GlyphTile, ITEM_GLYPHS, Keycap, Meta, Palette, type ItemKind } from "./palette";
import styles from "./hero-loop.module.css";

/**
 * The hero's visual: Resonory's one idea told in three beats inside the page's
 * search palette.
 *
 * 1. Save: four saved things fly into the palette's list, newest on top.
 * 2. Forget: months pass; they dim and the oldest sinks to the bottom.
 * 3. It comes back: "agile retrospective" types itself, and the X post saved
 *    in March lifts to the top of "From your saves", lit orange, its glyph
 *    turning into the logo's rising dot.
 *
 * It plays once, then repeats slowly, pausing while off screen (the shared
 * viewport observer). Under reduced motion, and before JavaScript runs, it
 * stands still on the final frame.
 */

export const HERO_STORY =
  "Three beats. Save: an X post, a video, an article and a PDF go into Resonory. Forget: months pass, and they dim and sink down the list, never opened. It comes back: a search for agile retrospective types itself, and the X post you saved in March rises to the top of your saves, lit orange like the dot in Resonory’s logo.";

const QUERY = "agile retrospective";

type Beat = "save" | "forget" | "back";

const BEATS: { beat: Beat; label: string }[] = [
  { beat: "save", label: "Save" },
  { beat: "forget", label: "Forget" },
  { beat: "back", label: "It comes back" },
];

/** The saves, in the order they arrive. The first is the one that comes back. */
const SAVES: { kind: ItemKind; kindName: string; title: string; month: string }[] = [
  {
    kind: "post",
    kindName: "X post",
    title: "Five retro formats your team won’t dread",
    month: "March",
  },
  {
    kind: "article",
    kindName: "Article",
    title: "Running a blameless retrospective",
    month: "May",
  },
  { kind: "video", kindName: "Video", title: "Knife skills in ten minutes", month: "June" },
  { kind: "pdf", kindName: "PDF", title: "Lisbon trip budget.pdf", month: "August" },
];

/** The saves that match the query, top first, once it comes back. */
const MATCHES = 2;

type Frame = {
  beat: Beat;
  /** How many saves have arrived. */
  arrived: number;
  /** The query has typed itself. */
  typed: boolean;
  /** The matching save has lifted to the top, lit. */
  lifted: boolean;
  /** Everything fades out before the loop starts again. */
  cleared: boolean;
  ms: number;
};

const frame = (beat: Beat, arrived: number, ms: number, more: Partial<Frame> = {}): Frame => ({
  beat,
  arrived,
  typed: false,
  lifted: false,
  cleared: false,
  ms,
  ...more,
});

const TIMELINE: Frame[] = [
  frame("save", 0, 900),
  frame("save", 1, 650),
  frame("save", 2, 650),
  frame("save", 3, 650),
  frame("save", 4, 1600),
  frame("forget", 4, 3200),
  frame("back", 4, 1500, { typed: true }),
  frame("back", 4, 7000, { typed: true, lifted: true }),
  frame("back", 4, 900, { typed: true, lifted: true, cleared: true }),
];

const FINAL: Frame = TIMELINE[7]!;

/** Row height in px: every row sits at a multiple of it, moved by transform only. */
const ROW = 56;
const WEB_LABEL_Y = MATCHES * ROW + 8;
const WEB_ROW_Y = WEB_LABEL_Y + 28;

/** Where save `index` sits, and how it looks, in `f`. */
function saveStyle(index: number, f: Frame): CSSProperties {
  if (index >= f.arrived) {
    // Not saved yet: just above and to the right, ready to fly in.
    return { opacity: 0, transform: "translate(32px, -40px) scale(0.94) rotate(-2deg)" };
  }
  // Newest on top, so the first save sinks to the bottom as the rest pile on.
  const pile = f.arrived - 1 - index;
  if (f.lifted) {
    if (index < MATCHES) return { opacity: 1, transform: `translateY(${index * ROW}px)` };
    return { opacity: 0, transform: `translateY(${pile * ROW + 16}px) scale(0.98)` };
  }
  if (f.beat === "save") return { opacity: 1, transform: `translateY(${pile * ROW}px)` };
  // Forgotten: dimmed, settled a little lower.
  return { opacity: 0.4, transform: `translateY(${pile * ROW + 4}px) scale(0.98)` };
}

const on = (shown: boolean, delay = 0): CSSProperties => ({
  opacity: shown ? 1 : 0,
  transitionDelay: shown ? `${delay}ms` : "0ms",
});

/** The glyph tile of the save coming back: the logo, its dot rising out of the stack. */
function RisingDot({ lifted }: { lifted: boolean }) {
  return (
    <span
      className={`absolute inset-0 flex items-center justify-center rounded-lg border border-accent/40 bg-accent/15 ${styles.fades}`}
      style={on(lifted)}
    >
      <svg viewBox={SYMBOL_VIEW_BOX} className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
        <path fill={brandColors.text} d={SYMBOL_BARS_PATH} />
        <path
          fill={brandColors.accent}
          d={SYMBOL_DOT_PATH}
          className={styles.rises}
          style={{
            ...on(lifted, 250),
            transform: lifted ? "none" : "translateY(16px)",
          }}
        />
      </svg>
    </span>
  );
}

function SaveRow({ index, f }: { index: number; f: Frame }) {
  const save = SAVES[index]!;
  const lit = index === 0 && f.lifted;
  const meta = f.beat === "save" ? "just saved" : `saved in ${save.month}`;
  return (
    <li
      className={`absolute inset-x-0 top-0 flex h-14 items-center gap-3 px-2 ${index === 0 ? styles.rises : styles.moves}`}
      style={{
        ...saveStyle(index, f),
        transitionDelay: f.beat === "save" ? "0ms" : `${index * 60}ms`,
      }}
    >
      {index === 0 && (
        <span
          className={`absolute inset-0 rounded-lg border border-accent/40 bg-accent/10 ${styles.fades}`}
          style={on(lit, 300)}
        />
      )}
      <span className="relative">
        <span className={`block ${styles.fades}`} style={on(!lit)}>
          <GlyphTile icon={ITEM_GLYPHS[save.kind]} />
        </span>
        {index === 0 && <RisingDot lifted={lit} />}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-text">{save.title}</span>
        <Meta className={`truncate ${lit ? "text-accent" : ""}`}>
          {save.kindName} · {meta}
        </Meta>
      </span>
      {index === 0 && (
        <span className={`relative ${styles.fades}`} style={on(lit, 500)}>
          <Keycap>↵</Keycap>
        </span>
      )}
    </li>
  );
}

/** The palette's section label, which names what the list is in each beat. */
function ListLabel({ f }: { f: Frame }) {
  const labels = [
    { text: "Just saved", shown: f.beat === "save" },
    { text: "Saved · never opened", shown: f.beat !== "save" && !f.lifted },
    { text: "From your saves", shown: f.lifted },
  ];
  return (
    <span className="relative block h-7">
      {labels.map((label) => (
        <Meta
          key={label.text}
          className={`absolute inset-x-2 top-2 truncate ${
            label.text === "From your saves" ? "text-text" : ""
          }`}
        >
          <span className={`block ${styles.fades}`} style={on(label.shown, 150)}>
            {label.text}
          </span>
        </Meta>
      ))}
    </span>
  );
}

function SearchInput({ typed }: { typed: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-4 py-4">
      <MagnifyingGlass aria-hidden="true" size={20} className="shrink-0 text-muted" />
      <span className="relative min-w-0 flex-1 truncate text-lg sm:text-xl">
        <span className={`absolute inset-0 truncate text-muted ${styles.fades}`} style={on(!typed)}>
          Paste a link, or search
        </span>
        <span className="relative text-text">
          {[...QUERY].map((char, index) => (
            <span key={index} className={styles.types} style={on(typed, 200 + index * 55)}>
              {char}
            </span>
          ))}
        </span>
      </span>
      <Keycap>esc</Keycap>
    </div>
  );
}

/** Which beat is playing: a quiet stepper above the palette. */
function BeatIndicator({ beat }: { beat: Beat }) {
  return (
    <ol aria-label="Story beats" className="flex gap-2">
      {BEATS.map((step) => {
        const current = step.beat === beat;
        return (
          <li
            key={step.beat}
            aria-current={current ? "step" : undefined}
            className="flex flex-1 flex-col gap-2"
          >
            <span className="relative h-0.5 overflow-hidden rounded-full bg-hairline">
              <span
                className={`absolute inset-0 ${step.beat === "back" ? "bg-accent" : "bg-text"} ${styles.fades}`}
                style={on(current)}
              />
            </span>
            <span
              className={`font-mono text-xs ${
                current ? (step.beat === "back" ? "text-accent" : "text-text") : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function HeroLoop() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewport(ref);
  const reducedMotion = useReducedMotion();
  // -1 is the still final frame: what the server sends, and all reduced motion ever sees.
  const [step, setStep] = useState(-1);

  const playing = !reducedMotion && inView;
  useEffect(() => {
    if (!playing) return;
    if (step < 0) {
      setStep(0);
      return;
    }
    const timer = setTimeout(() => setStep((step + 1) % TIMELINE.length), TIMELINE[step]!.ms);
    return () => clearTimeout(timer);
  }, [playing, step]);

  const still = reducedMotion || step < 0;
  const f = still ? FINAL : TIMELINE[step]!;

  return (
    <figure
      ref={ref}
      data-slot="hero-loop"
      data-beat={still ? "still" : f.beat}
      className="flex w-full flex-col gap-4"
    >
      <BeatIndicator beat={f.beat} />
      <div role="img" aria-label={HERO_STORY}>
        <Palette className="overflow-hidden">
          <SearchInput typed={f.typed} />
          <div className={styles.stage}>
            <div className={`p-2 ${styles.fades}`} style={on(!f.cleared, 600)}>
              <ListLabel f={f} />
              <ul className="relative" style={{ height: SAVES.length * ROW }}>
                {SAVES.map((save, index) => (
                  <SaveRow key={save.title} index={index} f={f} />
                ))}
                <li
                  className={`absolute inset-x-2 top-0 ${styles.moves}`}
                  style={{
                    ...on(f.lifted, 700),
                    transform: `translateY(${WEB_LABEL_Y + (f.lifted ? 0 : 12)}px)`,
                  }}
                >
                  <Meta>From the web</Meta>
                </li>
                <li
                  className={`absolute inset-x-0 top-0 flex h-14 items-center gap-3 px-2 ${styles.moves}`}
                  style={{
                    opacity: f.lifted ? 0.6 : 0,
                    transitionDelay: f.lifted ? "800ms" : "0ms",
                    transform: `translateY(${WEB_ROW_Y + (f.lifted ? 0 : 12)}px)`,
                  }}
                >
                  <GlyphTile icon={ITEM_GLYPHS.link} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-text">{QUERY} template</span>
                    <Meta>Search the web</Meta>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-hairline bg-card-raised/50 px-4 py-2">
            <LogoSymbol className="h-4 w-auto" />
            <span className="flex items-center gap-2">
              <Meta>Open</Meta>
              <Keycap>↵</Keycap>
              <Meta className="ml-2 hidden sm:inline">Actions</Meta>
              <span className="hidden sm:inline-flex">
                <Keycap>⌘K</Keycap>
              </span>
            </span>
          </div>
        </Palette>
      </div>
    </figure>
  );
}
