import { Check } from "@phosphor-icons/react/dist/ssr";
import { brandColors } from "@/brand/colors";
import { SYMBOL_BARS_PATH, SYMBOL_DOT_PATH, SYMBOL_VIEW_BOX } from "@/brand/logo";

/**
 * What a visitor sees in place of the form once they have joined. The logo
 * plays the moment the page is about: its orange dot rises out of the stack
 * (a saved thing coming back), a ring spreads from it once, and a check pops
 * onto the mark, in the success green. Every animation ends where the card rests, so under reduced
 * motion (which switches them all off) the finished card is what shows.
 */
export function JoinedCard() {
  return (
    <div
      role="status"
      className="flex w-full max-w-[520px] animate-card-in items-center gap-3 rounded-xl border border-line-strong bg-card p-3 shadow-palette sm:gap-3.5 sm:rounded-[13px] sm:p-3.5"
    >
      <span aria-hidden="true" className="relative shrink-0">
        <svg viewBox={SYMBOL_VIEW_BOX} className="size-10 overflow-visible sm:size-11">
          <path fill={brandColors.text} d={SYMBOL_BARS_PATH} />
          <g className="animate-dot-rise [transform-box:fill-box] [transform-origin:center]">
            <circle
              cx="24"
              cy="11"
              r="5"
              fill="none"
              stroke={brandColors.accent}
              strokeWidth="1"
              className="animate-dot-ring opacity-0 [transform-box:fill-box] [transform-origin:center]"
            />
            <path fill={brandColors.accent} d={SYMBOL_DOT_PATH} />
          </g>
        </svg>
        <span className="absolute -right-1.5 -bottom-1.5 grid size-[18px] animate-pop-in place-items-center rounded-full border-2 border-card bg-success text-bg">
          <Check size={10} weight="bold" />
        </span>
      </span>
      <p className="min-w-0">
        <strong className="block text-[15px] leading-snug font-semibold tracking-[-0.01em] text-text sm:text-base">
          You&rsquo;re on the list.
        </strong>{" "}
        <span className="mt-0.5 block text-[13px] leading-normal text-pretty text-mute sm:text-[13.5px]">
          Check your inbox for a confirmation. We&rsquo;ll email you again when early access opens.
        </span>
      </p>
    </div>
  );
}
