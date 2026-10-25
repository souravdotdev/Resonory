import type { Icon } from "@phosphor-icons/react";
import { SYMBOL_BARS_PATH, SYMBOL_DOT_PATH, SYMBOL_VIEW_BOX } from "@/brand/logo";
import { ITEM_GLYPHS, Meta, type ItemKind } from "./palette";

/**
 * The drift layer's small cards: saved things and Cues, drawn as tiny
 * palettes. Purely decorative; the layer hides them from assistive technology.
 */

/** A saved thing as it floats past: what kind it is, its title, and the label it carries. */
export type DriftItem =
  { kind: "cue"; text: string } | { kind: ItemKind; label: string; title: string };

const CARD = "w-full rounded-xl border border-hairline bg-card p-2 shadow-palette";

function MiniGlyph({ icon: Glyph }: { icon: Icon }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-hairline bg-card-raised text-muted">
      <Glyph size={12} weight="bold" />
    </span>
  );
}

/** A thumbnail well, as a video or an image post shows before its title. */
function Thumbnail({ icon: Glyph, square = false }: { icon: Icon; square?: boolean }) {
  return (
    <span
      className={`flex w-full items-center justify-center rounded-md border border-hairline bg-card-raised text-muted ${
        square ? "aspect-square" : "aspect-video"
      }`}
    >
      <Glyph size={16} weight="bold" />
    </span>
  );
}

/**
 * The logo in miniature: the stack, with the dot that rises out of it.
 * `data-rise` lets the layer lift the dot when its thread arrives.
 */
function RisingMark() {
  return (
    <svg viewBox={SYMBOL_VIEW_BOX} className="h-3 w-auto shrink-0">
      <path className="fill-muted" d={SYMBOL_BARS_PATH} />
      <path data-rise className="fill-accent" d={SYMBOL_DOT_PATH} />
    </svg>
  );
}

export function DriftCard({ item }: { item: DriftItem }) {
  if (item.kind === "cue") {
    return (
      <div data-cue className={`${CARD} flex flex-col gap-1 bg-card-raised`}>
        <span className="flex items-center gap-1.5">
          <RisingMark />
          <Meta>Cue</Meta>
        </span>
        <span className="text-xs text-text">{item.text}</span>
      </div>
    );
  }

  const glyph = ITEM_GLYPHS[item.kind];
  const thumbnail = item.kind === "video" || item.kind === "image";
  return (
    <div className={`${CARD} flex flex-col gap-1.5`}>
      {thumbnail ? (
        <>
          <Thumbnail icon={glyph} square={item.kind === "image"} />
          <Meta className="truncate">{item.label}</Meta>
        </>
      ) : (
        <span className="flex min-w-0 items-center gap-1.5">
          <MiniGlyph icon={glyph} />
          <Meta className="truncate">{item.label}</Meta>
        </span>
      )}
      <span
        className={`line-clamp-2 text-xs text-text/80 ${
          item.kind === "pdf" || item.kind === "link" ? "font-mono break-all" : ""
        }`}
      >
        {item.title}
      </span>
    </div>
  );
}
