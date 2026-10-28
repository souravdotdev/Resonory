import type { CSSProperties, ReactNode } from "react";
import type { WallCard } from "./layout";
import { savedLabel, type DemoItem } from "./items";
import { thumbnailArt } from "./thumbnail-art";

/*
 * One Item's card on the wall, drawn the way the founder's design draws
 * each card style. The phone sizes come first; `sm:` carries the desktop ones,
 * which switch where the wall of columns starts (`COLUMNS_MIN_WIDTH`). Every title
 * fits its card whole: text is never cut off mid-word.
 */

const META = "truncate font-mono text-[9.5px] text-faint sm:text-[10px]";
const TITLE = "text-[12px] leading-[1.36] text-text sm:text-[12.5px] sm:leading-[1.38]";
const SOURCE =
  "flex min-w-0 items-center gap-1.5 font-mono text-[9.5px] whitespace-nowrap text-faint sm:text-[10px]";
const AVATAR =
  "grid size-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-card-raised font-mono text-[7.5px] text-text sm:size-5 sm:text-[8px]";

/** The stroked 16×16 icons the design draws for a post's counts. */
const ENGAGEMENT_ICONS = [
  "M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z",
  "M3 6.5l2-2 2 2 M5 4.5V10a1.5 1.5 0 001.5 1.5H9 M13 9.5l-2 2-2-2 M11 11.5V6a1.5 1.5 0 00-1.5-1.5H7",
  "M8 13s-5-3-5-6.5A2.7 2.7 0 018 5a2.7 2.7 0 015 1.5C13 10 8 13 8 13z",
];

function Favicon({ letter }: { letter: string }) {
  return (
    <span className="grid size-3.5 shrink-0 place-items-center rounded-[4px] border border-line-strong bg-card-raised text-[8px] text-text sm:size-[15px] sm:text-[8.5px]">
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

function Body({ item, artSeed }: { item: DemoItem; artSeed: number }): ReactNode {
  switch (item.style) {
    case "post":
      return (
        <>
          {/* When the name and the time don't both fit, the time wraps out of sight. */}
          <span className="flex h-[18px] min-w-0 shrink-0 flex-wrap items-center gap-x-1.5 overflow-hidden sm:h-5 sm:gap-x-[7px]">
            <span className={AVATAR}>{item.initials}</span>
            <span className="min-w-0 truncate text-[11px] leading-[18px] font-medium sm:text-[11.5px] sm:leading-5">
              {item.author}
            </span>
            <span className="ml-auto font-mono text-[9px] leading-[18px] whitespace-nowrap text-faint sm:text-[9.5px] sm:leading-5">
              {item.savedWhen}
            </span>
          </span>
          <span className={`${TITLE} line-clamp-2 sm:line-clamp-3`}>{item.title}</span>
          <span className="mt-auto flex items-center gap-[9px] font-mono text-[9px] text-faint sm:gap-2.5 sm:text-[9.5px]">
            {[item.replies, item.reposts, item.likes].map((count, i) => (
              <span
                key={ENGAGEMENT_ICONS[i]}
                className="inline-flex items-center gap-[3px] sm:gap-1"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-2.5 fill-none stroke-current stroke-[1.3] [stroke-linecap:round] [stroke-linejoin:round] sm:size-[11px]"
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
          <span className="relative grid h-10 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-card-raised text-text sm:h-16 sm:rounded-lg">
            <Art seed={artSeed} height={56} />
            <span className="relative grid size-[22px] place-items-center rounded-full bg-bg/60 sm:size-6">
              <svg viewBox="0 0 16 16" className="size-2.5 fill-current sm:size-[11px]">
                <path d="M6 4.5v7l5.5-3.5z" />
              </svg>
            </span>
            <span className="absolute right-[5px] bottom-1.5 rounded-[4px] bg-bg/72 px-1 py-px font-mono text-[8.5px] sm:right-1.5 sm:bottom-[7px] sm:text-[9px]">
              {item.duration}
            </span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-bg/60">
              <ProgressFill percent={item.progress} />
            </span>
          </span>
          <span className={`${TITLE} line-clamp-2`}>{item.title}</span>
          <span className={`mt-auto ${META}`}>{item.meta ?? savedLabel(item)}</span>
        </>
      );
    case "article":
      return (
        <>
          <span className={SOURCE}>
            <Favicon letter={item.favicon} />
            {item.domain}
          </span>
          <span className={`${TITLE} line-clamp-2`}>{item.title}</span>
          <span className="mt-auto flex items-center gap-2 font-mono text-[9px] whitespace-nowrap text-faint sm:mt-0 sm:text-[9.5px]">
            <span className="h-0.5 flex-1 overflow-hidden rounded-[2px] bg-card-raised">
              <ProgressFill percent={item.progress} />
            </span>
            {item.read}
          </span>
          <span className={`hidden sm:block ${META}`}>{savedLabel(item)}</span>
        </>
      );
    case "pdf":
      return (
        <span className="@container flex h-full min-w-0 items-stretch gap-2 sm:gap-2.5">
          <span className="flex h-9 w-[26px] shrink-0 flex-col gap-[3px] rounded-[3px] bg-text px-1 py-1.5 @max-[130px]:hidden sm:h-10 sm:w-[30px] sm:px-[5px]">
            {[72, 100, 100, 100, 100, 50].map((width, i) => (
              <i
                key={i}
                className={`block h-0.5 rounded-[1px] ${i === 0 ? "bg-bg/55" : "bg-bg/28"}`}
                style={{ width: `${width}%` }}
              />
            ))}
          </span>
          <span className="flex min-w-0 flex-col gap-[3px] sm:gap-1">
            <span className={`${TITLE} line-clamp-2`}>{item.title}</span>
            <span className={`mt-auto ${META}`}>{item.meta ?? savedLabel(item)}</span>
          </span>
        </span>
      );
    case "instagram":
      return (
        <>
          <span className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[7px] bg-card-raised sm:rounded-lg">
            <Art seed={artSeed} height={100} />
            <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-[3px] sm:bottom-[7px]">
              {[0, 1, 2, 3].map((dot) => (
                <i
                  key={dot}
                  className={`size-1 rounded-full ${dot === 0 ? "bg-text" : "bg-text/35"}`}
                />
              ))}
            </span>
          </span>
          <span className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-[7px]">
            <span className={AVATAR}>{item.initials}</span>
            <span className="line-clamp-2 min-w-0 text-[11px] leading-[1.36] sm:text-[11.5px]">
              {item.title}
            </span>
          </span>
          <span className={META}>{savedLabel(item)}</span>
        </>
      );
    case "link":
      return (
        <>
          <span className={SOURCE}>
            <Favicon letter={item.favicon} />
            {item.domain}
          </span>
          <span className={`${TITLE} line-clamp-2`}>{item.title}</span>
          <span className={`mt-auto ${META}`}>{savedLabel(item)}</span>
        </>
      );
  }
}

/** The pile a stacked card sits on: two edges peeking out below it. */
const STACK_SHADOW =
  "shadow-[0_5px_0_-2px_var(--color-card),0_5px_0_-1px_rgb(250_250_247/0.1),0_10px_0_-5px_var(--color-card),0_10px_0_-4px_rgb(250_250_247/0.08)]";

/**
 * How bright a card flickers while Resonory scans it: the design brightens it
 * 2.2 times, which on the dark wall is about as much more opaque.
 */
const SCAN_BRIGHTNESS = 2.2;

function cardStateClasses(lit: boolean, scanning: boolean): string {
  if (lit) return "z-3 -translate-y-1 scale-103 sm:-translate-y-1.5 sm:scale-[1.035]";
  if (scanning) return "-translate-y-0.5 [transition-duration:500ms,900ms]";
  return "";
}

/**
 * A card at its place on the wall. Scanned, it flickers brighter and lifts a
 * little; lit, it rises, turns orange and shows its rising dot. Every change
 * is an opacity or transform transition.
 */
export function ItemCard({
  card,
  lit,
  scanning,
}: {
  card: WallCard;
  lit: boolean;
  scanning: boolean;
}) {
  const { item, box } = card;
  const opacity = lit ? 1 : scanning ? Math.min(1, card.opacity * SCAN_BRIGHTNESS) : card.opacity;
  const position: CSSProperties = {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    opacity,
  };
  const showsUnopened = item.unopened && item.style !== "post" && item.style !== "pdf";

  return (
    <div
      data-wall-card=""
      data-lit={lit ? "" : undefined}
      style={position}
      className={`absolute transition-[opacity,transform] duration-900 ease-spring ${cardStateClasses(lit, scanning)}`}
    >
      <div
        className={`flex size-full flex-col gap-1.5 rounded-[11px] border border-line bg-card p-2.5 sm:gap-[7px] sm:rounded-xl sm:px-3 sm:py-[11px] ${
          card.stacked ? STACK_SHADOW : "overflow-hidden"
        }`}
      >
        <Body item={item} artSeed={card.artSeed} />
      </div>
      {/* The lit edge and glow, faded in over the card. */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-[11px] border border-accent shadow-[0_0_0_1px_var(--color-accent),0_0_22px_rgb(212_98_26/0.38)] transition-opacity duration-600 ease-spring sm:rounded-xl sm:shadow-[0_0_0_1px_var(--color-accent),0_0_28px_rgb(212_98_26/0.38)] ${
          lit ? "opacity-100" : "opacity-0"
        }`}
      />
      {showsUnopened && (
        <span
          className={`absolute top-[7px] right-[7px] rounded-[5px] border border-line-strong bg-bg px-[5px] py-[3px] font-mono text-[8.5px] leading-none text-mute transition-opacity duration-400 ease-spring sm:top-2 sm:right-2 sm:text-[9px] ${
            lit ? "opacity-0" : ""
          }`}
        >
          unopened
        </span>
      )}
      <span
        className={`absolute top-[9px] right-[9px] size-[7px] rounded-full bg-accent transition-[opacity,transform] duration-900 ease-spring sm:top-2.5 sm:right-2.5 sm:size-2 ${
          lit ? "opacity-100 delay-150" : "translate-y-1 opacity-0 sm:translate-y-[5px]"
        }`}
      />
    </div>
  );
}
