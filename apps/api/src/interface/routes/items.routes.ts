import type { Container } from "inversify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CreateItemResponseSchema,
  CreateItemSchema,
  MAX_HTML_LENGTH,
  MAX_URL_LENGTH,
} from "@resonory/shared/schemas/items";
import { TOKENS } from "@/di/tokens";
import type { ItemsController } from "@/interface/controllers/ItemsController";
import { authMiddleware } from "@/interface/middleware/auth.middleware";

/**
 * `POST /items`' request-body limit, in bytes, derived from the create-Item
 * schema's caps so the two can't drift apart: two bytes per character of the
 * URL and the captured page content, plus headroom for the JSON around them.
 * A body within it reaches the schema, so oversized content gets the
 * schema's 400, not Fastify's 413 (its 1 MiB default applied before).
 */
export const CREATE_ITEM_BODY_LIMIT = 2 * (MAX_URL_LENGTH + MAX_HTML_LENGTH) + 64 * 1024;

export interface ItemsRoutesOptions {
  container: Container;
}

/** `POST /items`: save a pasted URL as a Processing Item. */
export const itemsRoutes: FastifyPluginAsyncZod<ItemsRoutesOptions> = async (
  app,
  { container },
) => {
  // The container builds the controller; the route file never does.
  const itemsController = () => container.get<ItemsController>(TOKENS.ItemsController);

  app.post(
    "/items",
    {
      preHandler: authMiddleware(container),
      bodyLimit: CREATE_ITEM_BODY_LIMIT,
      schema: { body: CreateItemSchema, response: { 201: CreateItemResponseSchema } },
    },
    // request.body is CreateItemInput, already trimmed and validated
    (request, reply) => itemsController().create(request, reply),
  );
};
