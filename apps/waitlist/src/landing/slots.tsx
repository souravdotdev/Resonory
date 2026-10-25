import { ArrowsClockwise, Bell, EnvelopeSimple, Stack } from "@phosphor-icons/react/dist/ssr";
import { GlyphTile, ITEM_GLYPHS, Meta, Palette, type ItemKind } from "./palette";

/**
 * The page's visual slots. Each renders a still, simple stand in for now; the
 * hero loop, the section illustrations and the drift layer replace them in
 * place, keeping their props and their text descriptions.
 */

export { HERO_STORY, HeroLoop } from "./hero-loop";

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
