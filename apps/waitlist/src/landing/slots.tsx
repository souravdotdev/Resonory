import {
  ArrowsClockwise,
  Bell,
  EnvelopeSimple,
  MagnifyingGlass,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { LogoSymbol } from "@/app/logo";
import { GlyphTile, ITEM_GLYPHS, Keycap, Meta, Palette, type ItemKind } from "./palette";

/**
 * The page's visual slots. Each renders a still, simple stand in for now; the
 * hero loop, the section illustrations and the drift layer replace them in
 * place, keeping their props and their text descriptions.
 */

/** A search result row in a palette. `lit` is a save coming back: the logo's orange dot. */
function ResultRow({
  kind,
  title,
  meta,
  lit = false,
}: {
  kind: ItemKind;
  title: string;
  meta: string;
  lit?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-2 py-2 ${
        lit ? "border-accent/40 bg-accent/10" : "border-transparent"
      }`}
    >
      <GlyphTile icon={ITEM_GLYPHS[kind]} lit={lit} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-text">{title}</span>
        <Meta className={lit ? "text-accent" : ""}>{meta}</Meta>
      </span>
      {lit && <Keycap>↵</Keycap>}
    </li>
  );
}

export const HERO_STORY =
  "A search for agile retrospective. Above the web results, Resonory lifts an X post you saved in March and forgot, lit orange like the dot in its logo.";

/**
 * The hero's visual: a palette searching "agile retrospective", whose top
 * result is a save coming back. Shown still, on its final frame.
 */
export function HeroLoop() {
  return (
    <figure data-slot="hero-loop" role="img" aria-label={HERO_STORY} className="w-full">
      <Palette className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-4">
          <MagnifyingGlass aria-hidden="true" size={20} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-lg text-text sm:text-xl">
            agile retrospective
          </span>
          <Keycap>esc</Keycap>
        </div>
        <div className="flex flex-col gap-2 p-2">
          <Meta className="px-2 pt-2">From your saves</Meta>
          <ul className="flex flex-col">
            <ResultRow
              lit
              kind="post"
              title="Five retro formats your team won’t dread"
              meta="X post · saved in March"
            />
            <ResultRow
              kind="article"
              title="Running a blameless retrospective"
              meta="Article · saved in January"
            />
            <ResultRow
              kind="video"
              title="Agile principles, explained in 14 minutes"
              meta="Video · saved last year"
            />
          </ul>
          <Meta className="px-2 pt-2">From the web</Meta>
          <ul className="flex flex-col opacity-60">
            <ResultRow kind="link" title="agile retrospective template" meta="Search the web" />
          </ul>
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
    </figure>
  );
}

/** The problem section's picture: the pile of saves. Decorative, the text says the same. */
export function ProblemIllustration() {
  const pile: { kind: ItemKind; title: string; meta: string }[] = [
    { kind: "article", title: "How to write a design doc people read", meta: "saved 8 months ago" },
    { kind: "video", title: "Sourdough at home, start to finish", meta: "saved 5 months ago" },
    { kind: "pdf", title: "Q3 pricing teardown.pdf", meta: "saved 3 months ago" },
    { kind: "post", title: "A thread on naming things in code", meta: "saved 6 weeks ago" },
  ];
  return (
    <div data-slot="problem-illustration" aria-hidden="true" className="w-full">
      <Palette className="p-2">
        <Meta className="block px-2 pt-2 pb-2">Saved · never opened</Meta>
        <ul className="flex flex-col">
          {pile.map((item, index) => (
            <li
              key={item.title}
              className="flex items-center gap-3 px-2 py-2"
              style={{ opacity: 1 - index * 0.2 }}
            >
              <GlyphTile icon={ITEM_GLYPHS[item.kind]} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-text">{item.title}</span>
                <Meta>{item.meta}</Meta>
              </span>
            </li>
          ))}
        </ul>
      </Palette>
    </div>
  );
}

/** The thread joining the three steps. A still hairline for now. */
export function StepsThread() {
  return (
    <div
      data-slot="steps-thread"
      aria-hidden="true"
      className="absolute top-4 bottom-4 left-4 w-px bg-hairline"
    />
  );
}

export type Way = "related-items" | "rediscover-digest" | "reminder" | "cue";

const WAY_GLYPHS = {
  "related-items": Stack,
  "rediscover-digest": EnvelopeSimple,
  reminder: Bell,
  cue: ArrowsClockwise,
} as const;

/** One way a save comes back, pictured. A still glyph tile for now. Decorative. */
export function WayIllustration({ way }: { way: Way }) {
  const Glyph = WAY_GLYPHS[way];
  return (
    <div
      data-slot="way-illustration"
      data-way={way}
      aria-hidden="true"
      className="flex h-32 items-center justify-center rounded-lg border border-hairline bg-bg"
    >
      <Glyph size={24} className="text-muted" />
    </div>
  );
}

export { DriftLayer } from "./drift-layer";
