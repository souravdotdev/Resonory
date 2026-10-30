import { describe, expect, it } from "vitest";
import type { CachedPreview } from "@/domain/providers/IUrlPreviewCache";
import { RedisUrlPreviewCache } from "@/infrastructure/cache/RedisUrlPreviewCache";

// A fake of just the two ioredis commands this adapter calls, backed by an
// in-memory map. `docker-compose.yml` does provision a local Redis for
// manual testing, but CI runs on a bare runner with no Redis service, so a
// unit test here can't depend on one being reachable — matching how every
// other infrastructure test in this repo (SharpThumbnailResizer, …) avoids
// needing an already-running external dependency.
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _seconds: number | string, value: string | Buffer | number) => {
      store.set(key, String(value));
      return "OK" as const;
    },
  };
}

const PREVIEW: CachedPreview = {
  type: "video",
  metadata: { title: "A video", description: null },
  thumbnailKey: "shared/abc123.webp",
};

describe("RedisUrlPreviewCache", () => {
  it("returns null for a URL never set", async () => {
    const cache = new RedisUrlPreviewCache(fakeRedis());

    await expect(cache.get("https://example.com/page")).resolves.toBeNull();
  });

  it("round-trips a cached preview for the same canonical URL", async () => {
    const cache = new RedisUrlPreviewCache(fakeRedis());

    await cache.set("https://example.com/page", PREVIEW);

    await expect(cache.get("https://example.com/page")).resolves.toEqual(PREVIEW);
  });

  it("round-trips a preview with no Thumbnail", async () => {
    const cache = new RedisUrlPreviewCache(fakeRedis());
    const noThumbnail: CachedPreview = { ...PREVIEW, thumbnailKey: null };

    await cache.set("https://example.com/page", noThumbnail);

    await expect(cache.get("https://example.com/page")).resolves.toEqual(noThumbnail);
  });

  it("keeps different canonical URLs separate", async () => {
    const cache = new RedisUrlPreviewCache(fakeRedis());

    await cache.set("https://example.com/a", PREVIEW);

    await expect(cache.get("https://example.com/b")).resolves.toBeNull();
  });

  it("sets a 7-day expiry on every write", async () => {
    const redis = fakeRedis();
    const cache = new RedisUrlPreviewCache(redis);
    let args: Parameters<typeof redis.setex> | undefined;
    redis.setex = async (...a: Parameters<typeof redis.setex>) => {
      args = a;
      redis.store.set(a[0], String(a[2]));
      return "OK";
    };

    await cache.set("https://example.com/page", PREVIEW);

    expect(args?.[1]).toBe(7 * 24 * 60 * 60);
  });
});
