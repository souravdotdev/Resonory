import { ImageResponse } from "next/og";
import { brandColors } from "@/brand/colors";
import { SymbolImage } from "@/brand/symbol-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home screen icon, matching `icon.tsx`. iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: brandColors.bg,
      }}
    >
      <SymbolImage width={112} />
    </div>,
    size,
  );
}
