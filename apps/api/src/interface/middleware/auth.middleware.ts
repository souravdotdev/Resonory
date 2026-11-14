import type { FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import type { Container } from "inversify";
import type { ResolveSignedInUserUseCase } from "@/application/use-cases/auth/ResolveSignedInUserUseCase";
import { TOKENS } from "@/di/tokens";
import type { User } from "@/domain/entities/User";
import { ForbiddenError } from "@/domain/errors";
import { API_KEY_HEADER } from "@/infrastructure/auth/apiKeyHeader";
import { toWebHeaders } from "@/interface/http/toWebHeaders";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `authMiddleware`; read it through `signedInUser(request)`. */
    user?: User;
  }
}

/**
 * The guard every protected route uses, as its `preHandler`: it runs
 * `ResolveSignedInUserUseCase`, whose `UnauthorizedError` (no valid Session, or a
 * deleted User) the error middleware sends as 401 `unauthorized`. Otherwise the
 * route reads the domain User with `signedInUser(request)`. Identity always
 * comes from here, never from the request body.
 */
export function authMiddleware(container: Container): preHandlerAsyncHookHandler {
  return async (request) => {
    const resolveSignedInUser = container.get<ResolveSignedInUserUseCase>(
      TOKENS.ResolveSignedInUserUseCase,
    );
    request.user = await resolveSignedInUser.execute({ headers: toWebHeaders(request.headers) });
  };
}

/**
 * `authMiddleware` for the routes only the web app may call (the Tag routes):
 * it runs the same guard, then refuses a request authenticated by an API key
 * (the extension's `x-api-key`, which Better Auth turns into a Session just like
 * a cookie) with `ForbiddenError`, sent as 403 `forbidden`. A missing or invalid
 * key still gets the guard's 401 first, since that request has no Session at all.
 */
export function sessionOnlyAuthMiddleware(container: Container): preHandlerAsyncHookHandler {
  const auth = authMiddleware(container);
  return async function (request, reply) {
    await auth.call(this, request, reply);
    // Better Auth's api-key plugin reads keys only from API_KEY_HEADER (createAuth
    // sets it, and createAuth.test.ts fails if that changes), and uses the key
    // over any Session cookie sent alongside it.
    const apiKey = request.headers[API_KEY_HEADER];
    if (typeof apiKey === "string" && apiKey !== "") {
      throw new ForbiddenError(
        `${request.method} ${request.routeOptions.url} takes only a web Session`,
      );
    }
  };
}

/** The User `authMiddleware` attached. Calling it on a route without the guard is a bug. */
export function signedInUser(request: FastifyRequest): User {
  if (request.user === undefined) {
    throw new Error(
      `${request.method} ${request.routeOptions.url} reads the User without authMiddleware`,
    );
  }
  return request.user;
}
