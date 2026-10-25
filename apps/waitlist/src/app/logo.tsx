import { brandColors } from "@/brand/colors";
import {
  LOCKUP_SYMBOL_TRANSFORM,
  LOCKUP_VIEW_BOX,
  LOCKUP_WORDMARK_PATH,
  LOCKUP_WORDMARK_TRANSFORM,
  SYMBOL_BARS_PATH,
  SYMBOL_DOT_PATH,
  SYMBOL_VIEW_BOX,
} from "@/brand/logo";

/** The horizontal lockup: symbol plus "Resonory". Every place that names the brand renders this. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOCKUP_VIEW_BOX}
      role="img"
      aria-label="Resonory"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={LOCKUP_SYMBOL_TRANSFORM}>
        <path fill={brandColors.text} d={SYMBOL_BARS_PATH} />
        <path fill={brandColors.accent} d={SYMBOL_DOT_PATH} />
      </g>
      <path
        fill={brandColors.text}
        transform={LOCKUP_WORDMARK_TRANSFORM}
        d={LOCKUP_WORDMARK_PATH}
      />
    </svg>
  );
}

/** The symbol alone, for small spaces. Decorative unless given a label. */
export function LogoSymbol({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox={SYMBOL_VIEW_BOX}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path fill={brandColors.text} d={SYMBOL_BARS_PATH} />
      <path fill={brandColors.accent} d={SYMBOL_DOT_PATH} />
    </svg>
  );
}
