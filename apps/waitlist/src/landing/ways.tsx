"use client";

import { useRef, type ReactNode } from "react";
import { Bell, EnvelopeSimple, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { useRevealOnEnter } from "@/motion/reveal";
import { GlyphTile, ITEM_GLYPHS, Keycap, Meta, type ItemKind } from "./palette";

/**
 * The four small pictures in "Four ways a save comes back", one per
 * Resurfacing form. Each is a tiny scene from the product that reads on its
 * own, described in text for screen readers.
 *
 * The scene's pieces arrive one after another the first time it scrolls into
 * view, through the shared viewport observer. Their resting state is the
 * finished scene, so on screen at load, under reduced motion and without
 * JavaScript the picture is simply there, still.
 */

export type Way = "related-items" | "rediscover-digest" | "reminder" | "cue";

/** A piece of the scene that rises into place, `order` steps into the sequence. */
function Beat({
  order,
  className = "",
  children,
}: {
  order: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`transition-[opacity,translate,scale] duration-700 ease-spring group-data-[play=waiting]/play:translate-y-4 group-data-[play=waiting]/play:opacity-0 motion-reduce:transition-none ${className}`}
      style={{ transitionDelay: `${300 + order * 180}ms` }}
    >
      {children}
    </div>
  );
}

/** A save as a compact row. `lit` is a save coming back: the logo's orange dot. */
function SaveRow({
  kind,
  title,
  meta,
  lit = false,
  boxed = false,
}: {
  kind: ItemKind;
  title: string;
  meta: string;
  lit?: boolean;
  boxed?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-2 py-2 ${
        lit
          ? "border-accent/40 bg-accent/10"
          : boxed
            ? "border-hairline bg-card"
            : "border-transparent"
      }`}
    >
      <GlyphTile icon={ITEM_GLYPHS[kind]} lit={lit} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-text">{title}</span>
        <Meta className={`truncate ${lit ? "text-accent" : ""}`}>{meta}</Meta>
      </span>
    </div>
  );
}

function RelatedItemsScene() {
  return (
    <>
      <Beat order={0}>
        <SaveRow
          boxed
          kind="article"
          title="Running a blameless retrospective"
          meta="Article · open now"
        />
      </Beat>
      <Beat order={1}>
        <Meta className="block px-2 pt-2">Related Items · 3</Meta>
      </Beat>
      <Beat order={2}>
        <SaveRow
          lit
          kind="post"
          title="Five retro formats your team won’t dread"
          meta="X post · saved 8 months ago"
        />
      </Beat>
      <Beat order={3}>
        <SaveRow
          kind="video"
          title="Agile principles, explained in 14 minutes"
          meta="Video · saved last year"
        />
      </Beat>
      <Beat order={4}>
        <SaveRow kind="pdf" title="Team health check.pdf" meta="PDF · saved in March" />
      </Beat>
    </>
  );
}

function RediscoverDigestScene() {
  return (
    <Beat order={0}>
      <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-card p-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <GlyphTile icon={EnvelopeSimple} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-text">Your Rediscover digest</span>
            <Meta className="truncate">Sunday · 3 saves you forgot</Meta>
          </span>
        </div>
        <div className="mx-2 h-px bg-hairline" />
        <Beat order={1}>
          <SaveRow
            lit
            kind="article"
            title="How to write a design doc people read"
            meta="saved 8 months ago"
          />
        </Beat>
        <Beat order={2}>
          <SaveRow
            kind="video"
            title="Sourdough at home, start to finish"
            meta="saved 5 months ago"
          />
        </Beat>
        <Beat order={3}>
          <SaveRow kind="image" title="Small balcony garden ideas" meta="saved last year" />
        </Beat>
      </div>
    </Beat>
  );
}

function ReminderScene() {
  return (
    <>
      <Beat order={0}>
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-card p-1">
          <SaveRow kind="pdf" title="Q3 pricing teardown.pdf" meta="PDF · saved today" />
          <div className="flex items-center gap-3 rounded-lg border border-hairline bg-card-raised px-3 py-2">
            <Bell aria-hidden="true" size={16} weight="bold" className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm text-text">
              Remind me about this in 2 weeks
            </span>
            <Keycap>↵</Keycap>
          </div>
        </div>
      </Beat>
      <Beat order={2}>
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="h-px flex-1 bg-hairline" />
          <Meta>2 weeks later</Meta>
          <span className="h-px flex-1 bg-hairline" />
        </div>
      </Beat>
      <Beat order={3}>
        <SaveRow lit kind="pdf" title="Q3 pricing teardown.pdf" meta="Reminder · back today" />
      </Beat>
    </>
  );
}

function CueScene() {
  return (
    <div className="relative flex flex-col gap-1 pb-24">
      <Beat order={0}>
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card px-3 py-3">
          <MagnifyingGlass aria-hidden="true" size={16} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-sm text-text">sourdough starter ratio</span>
          <Keycap>esc</Keycap>
        </div>
      </Beat>
      <Beat order={1} className="opacity-60">
        <SaveRow kind="link" title="Starter ratios for beginners" meta="From the web" />
      </Beat>
      <Beat
        order={3}
        className="absolute right-0 bottom-0 w-11/12 origin-bottom-right group-data-[play=waiting]/play:scale-95"
      >
        <div className="flex flex-col gap-1 rounded-xl border border-accent/40 bg-card-raised p-1 shadow-palette">
          <span className="flex items-center gap-2 px-2 pt-2 pb-1">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
            <Meta className="text-accent">You saved 2 things on this</Meta>
          </span>
          <SaveRow
            kind="video"
            title="Sourdough at home, start to finish"
            meta="Video · saved 5 months ago"
          />
        </div>
      </Beat>
    </div>
  );
}

const SCENES = {
  "related-items": {
    Scene: RelatedItemsScene,
    description:
      "An open save, an article on blameless retrospectives, with the 3 saves that belong with it listed below: an X post on retro formats, a video on agile principles and a PDF of a team health check.",
  },
  "rediscover-digest": {
    Scene: RediscoverDigestScene,
    description:
      "A weekly email, the Rediscover digest, bringing back 3 things you saved months ago and forgot: an article, a video and an image.",
  },
  reminder: {
    Scene: ReminderScene,
    description:
      "On a saved PDF, the command remind me about this in 2 weeks. Two weeks later the PDF comes back on its own.",
  },
  cue: {
    Scene: CueScene,
    description:
      "A search for sourdough starter ratio. Over the web results, a small card says you saved 2 things on this, with a sourdough video you saved months ago.",
  },
} satisfies Record<Way, { Scene: () => ReactNode; description: string }>;

/** One way a save comes back, pictured as a small scene from the product. */
export function WayIllustration({ way }: { way: Way }) {
  const ref = useRef<HTMLDivElement>(null);
  useRevealOnEnter(ref, "play");
  const { Scene, description } = SCENES[way];

  return (
    <div
      ref={ref}
      data-slot="way-illustration"
      data-way={way}
      role="img"
      aria-label={description}
      // Sized by its tile, never by its long titles, so a narrow screen never scrolls sideways.
      className="group/play flex h-80 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-bg px-4 [contain:inline-size]"
    >
      <div aria-hidden="true" className="flex w-full max-w-sm flex-col gap-1">
        <Scene />
      </div>
    </div>
  );
}
