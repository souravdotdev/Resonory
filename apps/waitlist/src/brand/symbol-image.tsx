import { brandColors } from "./colors";
import { SYMBOL_BARS_PATH, SYMBOL_DOT_PATH, SYMBOL_VIEW_BOX } from "./logo";

/** The logo symbol as plain SVG for `ImageResponse` (icons and the OG image). */
export function SymbolImage({ width }: { width: number }) {
  return (
    <svg width={width} height={(width * 36) / 40} viewBox={SYMBOL_VIEW_BOX}>
      <path fill={brandColors.text} d={SYMBOL_BARS_PATH} />
      <path fill={brandColors.accent} d={SYMBOL_DOT_PATH} />
    </svg>
  );
}
