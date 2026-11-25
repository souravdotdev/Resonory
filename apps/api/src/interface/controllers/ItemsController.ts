import type { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import type { CreateItemInput, DeleteItemParams } from "@resonory/shared/schemas/items";
import type { ItemCardOutput } from "@/application/dto/items/ItemCardOutput";
import type { DeleteItemUseCase } from "@/application/use-cases/items/DeleteItemUseCase";
import type { ListItemsOutput } from "@/application/dto/items/ListItemsOutput";
import type { ListItemsUseCase } from "@/application/use-cases/items/ListItemsUseCase";
import type { SaveItemUseCase } from "@/application/use-cases/items/SaveItemUseCase";
import { TOKENS } from "@/di/tokens";
import { signedInUser } from "@/interface/middleware/auth.middleware";

/**
 * HTTP work only for the Item routes: `create` saves a link (the User and validated body
 * in, the new Item card out), `list` returns the User's Library (the User in, every
 * Item card out), and `delete` deletes one of the User's Items (the User and validated
 * Item id in, an empty 204 out).
 *
 * Convention: a use case that logs gets this request's logger (one carrying its `reqId`) as
 * a plain argument at the call site, as `delete` does with
 * `deleteItemUseCase.execute(input, request.log)`, the same way `request`/`reply` already
 * flow into a controller method — never as a constructor-injected dependency. A constructor
 * injection is a singleton bound once for the process's life, but the *binding* (the reqId)
 * is different on every call, so it can't live there.
 */
@injectable()
export class ItemsController {
  constructor(
    @inject(TOKENS.SaveItemUseCase) private readonly saveItemUseCase: SaveItemUseCase,
    @inject(TOKENS.ListItemsUseCase) private readonly listItemsUseCase: ListItemsUseCase,
    @inject(TOKENS.DeleteItemUseCase) private readonly deleteItemUseCase: DeleteItemUseCase,
  ) {}

  list = async (request: FastifyRequest): Promise<ListItemsOutput> =>
    this.listItemsUseCase.execute({ userId: signedInUser(request).id });

  create = async (
    request: FastifyRequest<{ Body: CreateItemInput }>,
    reply: FastifyReply,
  ): Promise<ItemCardOutput> => {
    const card = await this.saveItemUseCase.execute({
      userId: signedInUser(request).id,
      sourceUrl: request.body.url,
      html: request.body.html,
      captions: request.body.captions,
    });
    reply.code(201);
    return card;
  };

  delete = async (
    request: FastifyRequest<{ Params: DeleteItemParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.deleteItemUseCase.execute(
      { userId: signedInUser(request).id, itemId: request.params.itemId },
      request.log,
    );
    reply.code(204);
  };
}
