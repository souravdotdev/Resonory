import type { CSSProperties, ReactNode } from "react";
import type { WallCard } from "./layout";
import type { Save } from "./saves";
import { thumbnailArt } from "./thumbnail-art";

/*
 * One saved card on the wall, drawn the way the founder's design draws each
 * kind of save. The phone sizes come first; `lg:` carries the desktop ones,
 * which switch at the same width as the wall's desktop layout. A link's
 * title keeps to one line: two don't fit its card's height.
 */

const META = "truncate font-mono text-[9.5px] text-faint lg:text-[10px]";
const TITLE = "text-[12px] leading-[1.36] text-text lg:text-[12.5px] lg:leading-[1.38]";
const SOURCE =
  "flex min-w-0 items-center gap-1.5 font-mono text-[9.5px] whitespace-nowrap text-faint lg:text-[10px]";
const AVATAR =
  "grid size-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-card-raised font-mono text-[7.5px] text-text lg:size-5 lg:text-[8px]";

/** The stroked 16×16 icons the design draws for a post's counts. */
const ENGAGEMENT_ICONS = [
  "M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z",
  "M3 6.5l2-2 2 2 M5 4.5V10a1.5 1.5 0 001.5 1.5H9 M13 9.5l-2 2-2-2 M11 11.5V6a1.5 1.5 0 00-1.5-1.5H7",
  "M8 13s-5-3-5-6.5A2.7 2.7 0 018 5a2.7 2.7 0 015 1.5C13 10 8 13 8 13z",
];

function Favicon({ letter }: { letter: string }) {
  return (
    <span className="grid size-3.5 shrink-0 place-items-center rounded-[4px] border border-line-strong bg-card-raised text-[8px] text-text lg:size-[15px] lg:text-[8.5px]">
      {letter}
    </span>
  );
}

function ProgressFill({ percent }: { percent: number }) {
  return <i className="block h-full bg-text/72" style={{ width: `${percent}%` }} />;
}

/** The stand-in photo: a sun over a ridge, seeded per card. */
function Art({ seed, height }: { seed: number; height: number }) {
  const art = thumbnailArt(seed, height);
  return (
    <svg
      viewBox={art.viewBox}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <circle cx={art.sun.cx} cy={art.sun.cy} r={art.sun.r} fill="rgb(250 250 247 / 0.2)" />
      <path d={art.ridge} fill="rgb(250 250 247 / 0.09)" />
      <path d={art.ground} fill="rgb(20 20 20 / 0.45)" />
    </svg>
  );
}

function Body({ save, artSeed }: { save: Save; artSeed: number }): ReactNode {
  switch (save.kind) {
    case "post":
      return (
        <>
          <span className="flex min-w-0 items-center gap-1.5 lg:gap-[7px]">
            <span className={AVATAR}>{save.initials}</span>
            <span className="min-w-0 truncate text-[11px] font-medium lg:text-[11.5px]">
              {save.author}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[9px] whitespace-nowrap text-faint lg:text-[9.5px]">
              {save.when}
            </span>
          </span>
          <span className={`${TITLE} line-clamp-2 lg:line-clamp-3`}>{save.title}</span>
          <span className="mt-auto flex items-center gap-[9px] font-mono text-[9px] text-faint lg:gap-2.5 lg:text-[9.5px]">
            {[save.replies, save.reposts, save.likes].map((count, i) => (
              <span
                key={ENGAGEMENT_ICONS[i]}
                className="inline-flex items-center gap-[3px] lg:gap-1"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-2.5 fill-none stroke-current stroke-[1.3] [stroke-linecap:round] [stroke-linejoin:round] lg:size-[11px]"
                >
                  <path d={ENGAGEMENT_ICONS[i]} />
                </svg>
                {count}
              </span>
            ))}
          </span>
        </>
      );
    case "video":
      return (
        <>
          <span className="relative grid h-[46px] shrink-0 place-items-center overflow-hidden rounded-[7px] bg-card-raised text-text lg:h-16 lg:rounded-lg">
            <Art seed={artSeed} height={56} />
            <span className="relative grid size-[22px] place-items-center rounded-full bg-bg/60 lg:size-6">
              <svg viewBox="0 0 16 16" className="size-2.5 fill-current lg:size-[11px]">
                <path d="M6 4.5v7l5.5-3.5z" />
              </svg>
            </span>
            <span className="absolute right-[5px] bottom-1.5 rounded-[4px] bg-bg/72 px-1 py-px font-mono text-[8.5px] lg:right-1.5 lg:bottom-[7px] lg:text-[9px]">
              {save.duration}
            </span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-bg/60">
              <ProgressFill percent={save.progress} />
            </span>
          </span>
          <span className={`${TITLE} line-clamp-1 lg:line-clamp-2`}>{save.title}</span>
          <span className={`mt-auto ${META}`}>{save.meta}</span>
        </>
      );
    case "article":
      return (
        <>
          <span className={SOURCE}>
            <Favicon letter={save.favicon} />
            {save.domain}
          </span>
          <span className={`${TITLE} line-clamp-2`}>{save.title}</span>
          <span className="mt-auto flex items-center gap-2 font-mono text-[9px] whitespace-nowrap text-faint lg:mt-0 lg:text-[9.5px]">
            <span className="h-0.5 flex-1 overflow-hidden rounded-[2px] bg-card-raised">
              <ProgressFill percent={save.progress} />
            </span>
            {save.read}
          </span>
          <span className={`hidden lg:block ${META}`}>{save.meta}</span>
        </>
      );
    case "pdf":
      return (
        <span className="flex h-full min-w-0 items-stretch gap-[9px] lg:gap-2.5">
          <span className="flex h-10 w-[30px] shrink-0 flex-col gap-[3px] rounded-[3px] bg-text px-[5px] py-1.5">
            {[72, 100, 100, 100, 100, 50].map((width, i) => (
              <i
                key={i}
                className={`block h-0.5 rounded-[1px] ${i === 0 ? "bg-bg/55" : "bg-bg/28"}`}
                style={{ width: `${width}%` }}
              />
            ))}
          </span>
          <span className="flex min-w-0 flex-col gap-[3px] lg:gap-1">
            <span className={`${TITLE} line-clamp-2`}>{save.title}</span>
            <span className={`mt-auto ${META}`}>{save.meta}</span>
          </span>
        </span>
      );
    case "insta":
      return (
        <>
          <span className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[7px] bg-card-raised lg:rounded-lg">
            <Art seed={artSeed} height={100} />
            <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-[3px] lg:bottom-[7px]">
              {[0, 1, 2, 3].map((dot) => (
                <i
                  key={dot}
                  className={`size-1 rounded-full ${dot === 0 ? "bg-text" : "bg-text/35"}`}
                />
              ))}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5 lg:gap-[7px]">
            <span className={AVATAR}>{save.initials}</span>
            <span className="min-w-0 truncate text-[11px] lg:text-[11.5px]">{save.title}</span>
          </span>
          <span className={META}>{save.meta}</span>
        </>
      );
    case "link":
      return (
        <>
          <span className={SOURCE}>
            <Favicon letter={save.favicon} />
            {save.domain}
          </span>
          <span className={`${TITLE} line-clamp-1`}>{save.title}</span>
          <span className={`mt-auto ${META}`}>{save.meta}</span>
        </>
      );
  }
}

/** The pile a stacked card sits on: two edges peeking out below it. */
const STACK_SHADOW =
  "shadow-[0_5px_0_-2px_var(--color-card),0_5px_0_-1px_rgb(250_250_247/0.1),0_10px_0_-5px_var(--color-card),0_10px_0_-4px_rgb(250_250_247/0.08)]";

/**
 * A card at its place on the wall. Lit, it rises, turns orange and shows its
 * rising dot; every change is an opacity or transform transition.
 */
export function SaveCard({ card, lit }: { card: WallCard; lit: boolean }) {
  const { save, box } = card;
  const position: CSSProperties = {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    opacity: lit ? 1 : card.opacity,
  };
  const showsUnopened = save.unopened && save.kind !== "post" && save.kind !== "pdf";

  return (
    <div
      data-wall-card=""
      data-lit={lit ? "" : undefined}
      style={position}
      className={`absolute transition-[opacity,transform] duration-900 ease-spring ${
        lit ? "z-3 -translate-y-1 scale-103 lg:-translate-y-1.5 lg:scale-[1.035]" : ""
      }`}
    >
      <div
        className={`flex size-full flex-col gap-1.5 rounded-[11px] border border-line bg-card p-2.5 lg:gap-[7px] lg:rounded-xl lg:px-3 lg:py-[11px] ${
          card.stacked ? STACK_SHADOW : "overflow-hidden"
        }`}
      >
        <Body save={save} artSeed={card.artSeed} />
      </div>
      {/* The lit edge and glow, faded in over the card. */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-[11px] border border-accent shadow-[0_0_0_1px_var(--color-accent),0_0_22px_rgb(212_98_26/0.38)] transition-opacity duration-600 ease-spring lg:rounded-xl lg:shadow-[0_0_0_1px_var(--color-accent),0_0_28px_rgb(212_98_26/0.38)] ${
          lit ? "opacity-100" : "opacity-0"
        }`}
      />
      {showsUnopened && (
        <span
          className={`absolute top-[7px] right-[7px] rounded-[5px] border border-line-strong bg-bg px-[5px] py-[3px] font-mono text-[8.5px] leading-none text-mute transition-opacity duration-400 ease-spring lg:top-2 lg:right-2 lg:text-[9px] ${
            lit ? "opacity-0" : ""
          }`}
        >
          unopened
        </span>
      )}
      <span
        className={`absolute top-[9px] right-[9px] size-[7px] rounded-full bg-accent transition-[opacity,transform] duration-900 ease-spring lg:top-2.5 lg:right-2.5 lg:size-2 ${
          lit ? "opacity-100 delay-150" : "translate-y-1 opacity-0 lg:translate-y-[5px]"
        }`}
      />
    </div>
  );
}
