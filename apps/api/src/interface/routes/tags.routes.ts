import type { Container } from "inversify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  ItemTagParamsSchema,
  ItemTagsResponseSchema,
  TagItemSchema,
  UntagItemParamsSchema,
} from "@resonory/shared/schemas/items";
import { TOKENS } from "@/di/tokens";
import type { TagsController } from "@/interface/controllers/TagsController";
import { sessionOnlyAuthMiddleware } from "@/interface/middleware/auth.middleware";

export interface TagsRoutesOptions {
  container: Container;
}

/**
 * The Tag routes. Only the web app's Session may call them: an API key (the
 * extension's) is refused with 403 (`sessionOnlyAuthMiddleware`).
 *
 * - `POST /items/:itemId/tags`: tag one of the User's Items by name.
 * - `DELETE /items/:itemId/tags/:tagId`: take a Tag off one of the User's Items.
 */
export const tagsRoutes: FastifyPluginAsyncZod<TagsRoutesOptions> = async (app, { container }) => {
  // The container builds the controller; the route file never does.
  const tagsController = () => container.get<TagsController>(TOKENS.TagsController);

  app.post(
    "/items/:itemId/tags",
    {
      preHandler: sessionOnlyAuthMiddleware(container),
      schema: {
        params: ItemTagParamsSchema,
        body: TagItemSchema,
        response: { 200: ItemTagsResponseSchema },
      },
    },
    // The name arrives as typed; TagItemUseCase reduces it to its Tag name.
    (request) => tagsController().tagItem(request),
  );

  app.delete(
    "/items/:itemId/tags/:tagId",
    {
      preHandler: sessionOnlyAuthMiddleware(container),
      schema: {
        params: UntagItemParamsSchema,
        response: { 200: ItemTagsResponseSchema },
      },
    },
    (request) => tagsController().untagItem(request),
  );
};
