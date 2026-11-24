import { vi } from "vitest";
import type { IThumbnailUrlProvider } from "@/domain/providers/IThumbnailUrlProvider";

/** The URL the fake signs a Thumbnail key to, so a test can tell which key a card's URL came from. */
export const signedThumbnailUrl = (key: string) =>
  `https://project.supabase.co/storage/v1/object/sign/thumbnails/${key}?token=fake`;

/**
 * A Thumbnail URL provider that signs every key to `signedThumbnailUrl`, except
 * the `unsignable` ones (a missing object, a bad key), which get null. Signing
 * one key at a time throws, so a list that doesn't sign in one batch fails.
 */
export function thumbnailsSigning({ unsignable = [] }: { unsignable?: readonly string[] } = {}) {
  const resolveMany = vi.fn(
    async (keys: readonly string[]) =>
      new Map(keys.map((key) => [key, unsignable.includes(key) ? null : signedThumbnailUrl(key)])),
  );
  const provider: IThumbnailUrlProvider = {
    resolve: async () => {
      throw new Error("signed one Thumbnail at a time");
    },
    resolveMany,
  };
  return { provider, resolveMany };
}
