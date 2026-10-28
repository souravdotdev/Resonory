import { ImageResponse } from "next/og";
import { brandColors } from "@/brand/colors";
import { SymbolImage } from "@/brand/symbol-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The favicon: the logo symbol on the page's ground, so it reads on light and dark tabs. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: brandColors.bg,
      }}
    >
      <SymbolImage width={44} />
    </div>,
    size,
  );
}
