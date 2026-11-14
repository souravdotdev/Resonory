import type { FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import type { ItemTagParams, TagItemInput } from "@resonory/shared/schemas/items";
import type { ItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";
import type { ListTagsOutput } from "@/application/dto/tags/ListTagsOutput";
import type { ListTagsUseCase } from "@/application/use-cases/tags/ListTagsUseCase";
import type { TagItemUseCase } from "@/application/use-cases/tags/TagItemUseCase";
import { TOKENS } from "@/di/tokens";
import { signedInUser } from "@/interface/middleware/auth.middleware";

/**
 * HTTP work only for the Tag routes: the User, the validated params and body in,
 * the Tags out. Same request-scoped logger convention as `ItemsController`.
 */
@injectable()
export class TagsController {
  constructor(
    @inject(TOKENS.TagItemUseCase) private readonly tagItemUseCase: TagItemUseCase,
    @inject(TOKENS.ListTagsUseCase) private readonly listTagsUseCase: ListTagsUseCase,
  ) {}

  tagItem = async (
    request: FastifyRequest<{ Params: ItemTagParams; Body: TagItemInput }>,
  ): Promise<ItemTagsOutput> =>
    this.tagItemUseCase.execute({
      userId: signedInUser(request).id,
      itemId: request.params.itemId,
      name: request.body.name,
    });

  list = async (request: FastifyRequest): Promise<ListTagsOutput> =>
    this.listTagsUseCase.execute({ userId: signedInUser(request).id });
}
