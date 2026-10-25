import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Geist semibold for generated images (OG image, icons). `ImageResponse` can't
 * read woff2, so this loads the TTF the `geist` package ships. These images
 * are rendered at build time, from the app's folder.
 */
export async function loadGeistSemibold() {
  const data = await readFile(
    join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
  );
  return { name: "Geist", data, weight: 600 as const, style: "normal" as const };
}

/** The theme colours, for generated images that can't read the CSS tokens. */
export const brandColors = {
  bg: "#141414",
  card: "#1F1F1F",
  border: "#313131",
  text: "#FAFAF7",
  muted: "#9B9B9B",
  accent: "#D4621A",
} as const;
