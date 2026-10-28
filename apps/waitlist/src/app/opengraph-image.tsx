import { ImageResponse } from "next/og";
import { brandColors } from "@/brand/colors";
import { loadGeistSemibold } from "@/brand/image-font";
import { SymbolImage } from "@/brand/symbol-image";

export const alt = "You saved it. Resonory brings it back. Join the waitlist at resonory.com.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview for social shares and chats, carrying the logo's mark. */
export default async function OpengraphImage() {
  const font = await loadGeistSemibold();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: brandColors.bg,
        color: brandColors.text,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36 }}>
        <SymbolImage width={56} />
        Resonory
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 84,
          lineHeight: 1.05,
          letterSpacing: -3,
          backgroundImage: `linear-gradient(to right, #FFFFFF, ${brandColors.muted})`,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        <span>You saved it.</span>
        <span>Resonory brings it back.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 32 }}>
        <div
          style={{
            display: "flex",
            padding: "16px 24px",
            borderRadius: 16,
            backgroundColor: brandColors.text,
            color: brandColors.bg,
          }}
        >
          Join the waitlist
        </div>
        <span style={{ color: brandColors.muted }}>resonory.com</span>
      </div>
    </div>,
    { ...size, fonts: [font] },
  );
}
