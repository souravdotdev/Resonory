import type { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import type { CreateItemInput } from "@resonory/shared/schemas/items";
import type { ItemCardOutput } from "@/application/dto/items/ItemCardOutput";
import type { SaveItemUseCase } from "@/application/use-cases/items/SaveItemUseCase";
import { TOKENS } from "@/di/tokens";
import { signedInUser } from "@/interface/middleware/auth.middleware";

/**
 * HTTP work only for the Item routes: the User and validated body in, the Item card out.
 *
 * Convention: nothing here logs yet, but if a use case ever needs its own request-scoped
 * logger (one carrying this request's `reqId`), hand it `request.log` as a plain argument
 * at the call site (e.g. `saveItemUseCase.execute(input, request.log)`), the same way
 * `request`/`reply` already flow into a controller method — never as a constructor-injected
 * dependency. A constructor injection is a singleton bound once for the process's life, but
 * the *binding* (the reqId) is different on every call, so it can't live there.
 */
@injectable()
export class ItemsController {
  constructor(@inject(TOKENS.SaveItemUseCase) private readonly saveItemUseCase: SaveItemUseCase) {}

  create = async (
    request: FastifyRequest<{ Body: CreateItemInput }>,
    reply: FastifyReply,
  ): Promise<ItemCardOutput> => {
    const card = await this.saveItemUseCase.execute({
      userId: signedInUser(request).id,
      sourceUrl: request.body.url,
      html: request.body.html,
    });
    reply.code(201);
    return card;
  };
}
