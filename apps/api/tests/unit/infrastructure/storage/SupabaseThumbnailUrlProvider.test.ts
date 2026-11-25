import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { SupabaseThumbnailUrlProvider } from "@/infrastructure/storage/SupabaseThumbnailUrlProvider";
import type {
  SignedUrlResult,
  SignedUrlsResult,
  ThumbnailStorage,
} from "@/infrastructure/storage/thumbnailStorage";

const key = "user-1/item-1.webp";
const signedUrl =
  "https://project.supabase.co/storage/v1/object/sign/thumbnails/user-1/item-1.webp?token=t";

// A fake Storage client that records which bucket, paths and expiry (and nothing else) were signed.
const storageAnswering = (
  answer: SignedUrlResult,
  batchAnswer: () => Promise<SignedUrlsResult> = async () => {
    throw new Error("not signing in a batch here");
  },
) => {
  const createSignedUrl = vi.fn(async () => answer);
  const createSignedUrls = vi.fn(batchAnswer);
  const remove = async () => {
    throw new Error("removed an object while signing");
  };
  const from = vi.fn(() => ({ createSignedUrl, createSignedUrls, remove }));
  return {
    storage: { from } satisfies ThumbnailStorage,
    from,
    createSignedUrl,
    createSignedUrls,
  };
};

// A batch-only fake: signing one key at a time fails the test.
const storageSigningBatch = (batchAnswer: () => Promise<SignedUrlsResult>) =>
  storageAnswering({ data: null, error: new Error("signed one key at a time") }, batchAnswer);

const otherKey = "user-1/item-2.webp";
const otherSignedUrl =
  "https://project.supabase.co/storage/v1/object/sign/thumbnails/user-1/item-2.webp?token=u";

describe("SupabaseThumbnailUrlProvider", () => {
  it("signs the Thumbnail key in the thumbnails bucket for 1 hour, with no transformation", async () => {
    const fake = storageAnswering({ data: { signedUrl }, error: null });

    const url = await new SupabaseThumbnailUrlProvider(fake.storage).resolve(key);

    expect(url).toBe(signedUrl);
    expect(fake.from).toHaveBeenCalledWith("thumbnails");
    expect(fake.createSignedUrl).toHaveBeenCalledWith(key, 3600);
  });

  // One missing object (or a bad key) mustn't break a whole list of cards.
  it("signs no link when Supabase Storage refuses to sign the key", async () => {
    const fake = storageAnswering({ data: null, error: new Error("Object not found") });

    await expect(new SupabaseThumbnailUrlProvider(fake.storage).resolve(key)).resolves.toBeNull();
  });

  describe("signing many keys", () => {
    it("signs every key in the thumbnails bucket for 1 hour, in one Storage call", async () => {
      const fake = storageSigningBatch(async () => ({
        data: [
          { path: key, signedUrl, error: null },
          { path: otherKey, signedUrl: otherSignedUrl, error: null },
        ],
        error: null,
      }));

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([
        key,
        otherKey,
      ]);

      expect(urls).toEqual(
        new Map([
          [key, signedUrl],
          [otherKey, otherSignedUrl],
        ]),
      );
      expect(fake.from).toHaveBeenCalledWith("thumbnails");
      expect(fake.createSignedUrls).toHaveBeenCalledTimes(1);
      expect(fake.createSignedUrls).toHaveBeenCalledWith([key, otherKey], 3600);
      expect(fake.createSignedUrl).not.toHaveBeenCalled();
    });

    // One missing object leaves only its card without a picture.
    it("gives null for only the key Storage refuses to sign", async () => {
      const fake = storageSigningBatch(async () => ({
        data: [
          {
            path: key,
            signedUrl: null,
            error: "Either the object does not exist or you do not have access to it",
          },
          { path: otherKey, signedUrl: otherSignedUrl, error: null },
        ],
        error: null,
      }));

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([
        key,
        otherKey,
      ]);

      expect(urls).toEqual(
        new Map([
          [key, null],
          [otherKey, otherSignedUrl],
        ]),
      );
    });

    it("gives null for every key when Storage answers the whole call with an error", async () => {
      const fake = storageSigningBatch(async () => ({
        data: null,
        error: new Error("Invalid Compact JWS"),
      }));

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([
        key,
        otherKey,
      ]);

      expect(urls).toEqual(
        new Map([
          [key, null],
          [otherKey, null],
        ]),
      );
    });

    it("gives null for every key, never an error, when the Storage call throws", async () => {
      const fake = storageSigningBatch(async () => {
        throw new Error("fetch failed");
      });

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([
        key,
        otherKey,
      ]);

      expect(urls).toEqual(
        new Map([
          [key, null],
          [otherKey, null],
        ]),
      );
    });

    it("makes no Storage call for no keys", async () => {
      const fake = storageSigningBatch(async () => ({ data: [], error: null }));

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([]);

      expect(urls).toEqual(new Map());
      expect(fake.createSignedUrls).not.toHaveBeenCalled();
    });

    it("signs a key that appears twice once", async () => {
      const fake = storageSigningBatch(async () => ({
        data: [{ path: key, signedUrl, error: null }],
        error: null,
      }));

      const urls = await new SupabaseThumbnailUrlProvider(fake.storage).resolveMany([key, key]);

      expect(urls).toEqual(new Map([[key, signedUrl]]));
      expect(fake.createSignedUrls).toHaveBeenCalledWith([key], 3600);
    });
  });
});
