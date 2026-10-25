import { ImageResponse } from "next/og";
import { brandColors } from "@/brand/colors";
import { loadGeistSemibold } from "@/brand/image-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home screen icon, matching `icon.tsx`. iOS rounds the corners itself. */
export default async function AppleIcon() {
  const font = await loadGeistSemibold();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: brandColors.accent,
        color: brandColors.text,
        fontFamily: "Geist",
        fontSize: 120,
        lineHeight: 1,
        paddingBottom: 10,
      }}
    >
      R
    </div>,
    { ...size, fonts: [font] },
  );
}
