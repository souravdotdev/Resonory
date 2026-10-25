import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://resonory.com/", changeFrequency: "weekly", priority: 1 },
    { url: "https://resonory.com/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];
}
