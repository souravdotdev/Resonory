import { ImageResponse } from "next/og";
import { brandColors } from "@/brand/colors";
import { loadGeistSemibold } from "@/brand/image-font";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * The favicon: the wordmark's initial in the theme colours. Replace this file
 * with `icon.png` (or `icon.svg`) from the logo files once they arrive.
 */
export default async function Icon() {
  const font = await loadGeistSemibold();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: brandColors.accent,
        color: brandColors.text,
        fontFamily: "Geist",
        fontSize: 46,
        lineHeight: 1,
        paddingBottom: 4,
      }}
    >
      R
    </div>,
    { ...size, fonts: [font] },
  );
}
