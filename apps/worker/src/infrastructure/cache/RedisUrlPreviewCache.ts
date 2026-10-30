import type { Redis } from "ioredis";
import { inject, injectable } from "inversify";
import { WORKER_TOKENS } from "@/di/tokens";
import type { CachedPreview, IUrlPreviewCache } from "@/domain/providers/IUrlPreviewCache";
import { sha256Hex } from "@/domain/rules/sha256Hex";

/** How long a cached preview is trusted before Processing runs fresh again. */
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const keyFor = (canonicalUrl: string) => `url-preview:${sha256Hex(canonicalUrl)}`;

/**
 * `IUrlPreviewCache` on the worker's shared Redis connection (the same one
 * BullMQ jobs arrive on; it's always bound, unlike the Thumbnail store, so
 * this is a plain injected adapter like the rest). A `CachedPreview` is
 * stored as JSON under a fixed key per canonical URL, expiring automatically
 * after `TTL_SECONDS`.
 */
@injectable()
export class RedisUrlPreviewCache implements IUrlPreviewCache {
  // Only the two commands actually used (setex over set+EX: a single clean
  // signature, not ioredis's combinatorial SET overloads), so a test can
  // supply a plain fake instead of a real connection.
  constructor(
    @inject(WORKER_TOKENS.RedisConnection) private readonly redis: Pick<Redis, "get" | "setex">,
  ) {}

  async get(canonicalUrl: string): Promise<CachedPreview | null> {
    const raw = await this.redis.get(keyFor(canonicalUrl));
    return raw === null ? null : (JSON.parse(raw) as CachedPreview);
  }

  async set(canonicalUrl: string, preview: CachedPreview): Promise<void> {
    await this.redis.setex(keyFor(canonicalUrl), TTL_SECONDS, JSON.stringify(preview));
  }
}
