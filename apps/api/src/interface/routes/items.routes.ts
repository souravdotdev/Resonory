import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Container } from "inversify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CreateItemResponseSchema,
  CreateItemSchema,
  MAX_CAPTIONS_LENGTH,
  MAX_HTML_LENGTH,
  MAX_URL_LENGTH,
} from "@resonory/shared/schemas/items";
import { TOKENS } from "@/di/tokens";
import type { ItemsController } from "@/interface/controllers/ItemsController";
import { authMiddleware } from "@/interface/middleware/auth.middleware";

/**
 * `POST /items`' request-body limit, in bytes, derived from the create-Item
 * schema's caps so the two can't drift apart: two bytes per character of the
 * URL, the captured page content and the captions, plus headroom for the JSON around them.
 * A body within it reaches the schema, so oversized content gets the
 * schema's 400, not Fastify's 413 (its 1 MiB default applied before).
 */
export const CREATE_ITEM_BODY_LIMIT =
  2 * (MAX_URL_LENGTH + MAX_HTML_LENGTH + MAX_CAPTIONS_LENGTH) + 64 * 1024;

/**
 * Who `POST /items`' rate limit counts against: the API key a request carries
 * (the extension's), so every save from one key shares a count wherever it
 * comes from, else the client's IP. The rate-limit hook runs before auth, so
 * the key is only read here, never checked: a made-up key gets its own count,
 * which is why the route also has an IP-wide limit (`CREATE_ITEM_IP_LIMIT`).
 * It's hashed, so the raw key never becomes a Redis key name.
 */
export function createItemRateLimitKey(request: FastifyRequest): string {
  const apiKey = request.headers["x-api-key"];
  if (typeof apiKey !== "string" || apiKey === "") return `ip:${request.ip}`;
  return `api-key:${createHash("sha256").update(apiKey).digest("hex")}`;
}

/**
 * `POST /items`' saves a minute from one IP, whatever keys they carry.
 * Checked first, so a client sending a fresh made-up key each time, which
 * would get a new per-key count every request, is still cut off here, before
 * its body is parsed. Twice the per-key limit, so two Users behind one IP
 * (a household) each keep theirs.
 */
export const CREATE_ITEM_IP_LIMIT = 60;

export interface ItemsRoutesOptions {
  container: Container;
}

/**
 * `POST /items`: save a pasted URL as a Processing Item. Its body can be
 * megabytes (captured page content), so it replaces the app-wide rate limit
 * with a stricter 30 a minute per API key (`createItemRateLimitKey`), plus
 * `CREATE_ITEM_IP_LIMIT` per IP.
 */
export const itemsRoutes: FastifyPluginAsyncZod<ItemsRoutesOptions> = async (
  app,
  { container },
) => {
  // The container builds the controller; the route file never does.
  const itemsController = () => container.get<ItemsController>(TOKENS.ItemsController);
  // Its own check, not a second `rateLimit` hook: @fastify/rate-limit runs only
  // one of those per request, so the per-key one would skip it.
  const ipWideLimit = app.createRateLimit({
    max: CREATE_ITEM_IP_LIMIT,
    timeWindow: "1 minute",
    keyGenerator: (request) => `ip:${request.ip}`,
  });

  app.post(
    "/items",
    {
      // Runs before the per-key limit's hook, which the plugin appends after it.
      onRequest: async (request, reply) => {
        const limit = await ipWideLimit(request);
        // `isAllowed` means allow-listed; over the limit is `isExceeded`.
        if (limit.isAllowed || !limit.isExceeded) return;
        reply.header("retry-after", limit.ttlInSeconds);
        // The error middleware sends it as 429 rate_limited, like the plugin's own.
        throw Object.assign(new Error("Too many saves from this IP"), { statusCode: 429 });
      },
      preHandler: authMiddleware(container),
      bodyLimit: CREATE_ITEM_BODY_LIMIT,
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute", keyGenerator: createItemRateLimitKey },
      },
      schema: { body: CreateItemSchema, response: { 201: CreateItemResponseSchema } },
    },
    // request.body is CreateItemInput, already trimmed and validated
    (request, reply) => itemsController().create(request, reply),
  );
};
