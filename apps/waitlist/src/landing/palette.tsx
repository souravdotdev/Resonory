import type { ReactNode } from "react";
import {
  Article,
  ChatCircleText,
  FilePdf,
  ImageSquare,
  LinkSimple,
  PlayCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/**
 * The page's shared pieces: floating palettes, keycaps, result rows and the
 * glyph for each kind of saved thing. Every section is built from these.
 */

/** A floating palette: the raised surface everything on the page sits in. */
export function Palette({
  children,
  className = "",
  raised = false,
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-hairline shadow-palette ${raised ? "bg-card-raised" : "bg-card"} ${className}`}
    >
      {children}
    </div>
  );
}

/** A keycap, such as ↵ or ⌘K. Decorative: the control it sits on carries the name. */
export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd
      aria-hidden="true"
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-hairline bg-card-raised px-1 font-mono text-xs text-muted"
    >
      {children}
    </kbd>
  );
}

/** A small meta label in the palette's mono voice, such as "Next" or "saved in March". */
export function Meta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-xs text-muted ${className}`}>{children}</span>;
}

/** The kinds of things people save, each with its glyph. */
export const ITEM_GLYPHS = {
  post: ChatCircleText,
  video: PlayCircle,
  article: Article,
  pdf: FilePdf,
  image: ImageSquare,
  link: LinkSimple,
} satisfies Record<string, Icon>;

export type ItemKind = keyof typeof ITEM_GLYPHS;

/** A glyph in its square tile, as it leads a result row. */
export function GlyphTile({ icon: Glyph, lit = false }: { icon: Icon; lit?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
        lit
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-hairline bg-card-raised text-muted"
      }`}
    >
      <Glyph size={16} weight="bold" />
    </span>
  );
}
