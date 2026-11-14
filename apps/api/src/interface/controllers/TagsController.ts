import type { FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import type { ItemTagParams, TagItemInput, UntagItemParams } from "@resonory/shared/schemas/items";
import type { ItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";
import type { TagItemUseCase } from "@/application/use-cases/tags/TagItemUseCase";
import type { UntagItemUseCase } from "@/application/use-cases/tags/UntagItemUseCase";
import { TOKENS } from "@/di/tokens";
import { signedInUser } from "@/interface/middleware/auth.middleware";

/**
 * HTTP work only for the Tag routes: the User, the validated params and body in,
 * the Item's Tags out. Same request-scoped logger convention as `ItemsController`.
 */
@injectable()
export class TagsController {
  constructor(
    @inject(TOKENS.TagItemUseCase) private readonly tagItemUseCase: TagItemUseCase,
    @inject(TOKENS.UntagItemUseCase) private readonly untagItemUseCase: UntagItemUseCase,
  ) {}

  tagItem = async (
    request: FastifyRequest<{ Params: ItemTagParams; Body: TagItemInput }>,
  ): Promise<ItemTagsOutput> =>
    this.tagItemUseCase.execute({
      userId: signedInUser(request).id,
      itemId: request.params.itemId,
      name: request.body.name,
    });

  untagItem = async (
    request: FastifyRequest<{ Params: UntagItemParams }>,
  ): Promise<ItemTagsOutput> =>
    this.untagItemUseCase.execute({
      userId: signedInUser(request).id,
      itemId: request.params.itemId,
      tagId: request.params.tagId,
    });
}
