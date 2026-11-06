import { inject, injectable } from "inversify";
import { APIError } from "better-auth/api";
import { TOKENS } from "@/di/tokens";
import type { User } from "@/domain/entities/User";
import type { ISessionProvider } from "@/domain/providers/ISessionProvider";
import { toUser } from "@/infrastructure/mappers/userMapper";

/** The User Better Auth's get-session returns: the `users` row, with optional fields possibly missing. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Declared to Better Auth as an additional User field in createAuth.
  deletedAt?: Date | null;
};

/** The one piece of Better Auth's server API this adapter uses. */
export interface SessionApi {
  getSession(context: { headers: Headers }): Promise<{ user: SessionUser } | null>;
}

/** Resolves a request's Session through Better Auth, which checks the `sessions` table every time. */
@injectable()
export class BetterAuthSessionProvider implements ISessionProvider {
  constructor(@inject(TOKENS.Auth) private readonly auth: { api: SessionApi }) {}

  async resolve(headers: Headers): Promise<User | null> {
    // Unlike a missing/malformed Session cookie (which `getSession` answers with a
    // plain `null`), a present-but-invalid API key header makes `getSession` throw
    // (e.g. a coded "Invalid API key" APIError) instead of returning null. That
    // difference would otherwise surface as a 403/500, not the 401 a missing/invalid
    // Session gets today (spec #144) — so it's normalized here to the same "no
    // Session" null every other caller of this method already handles.
    const session = await this.auth.api.getSession({ headers }).catch((error: unknown) => {
      if (error instanceof APIError) return null;
      throw error;
    });
    if (session === null) return null;

    // Better Auth may leave the nullable columns out; as a row they're null.
    const { user } = session;
    return toUser({ ...user, image: user.image ?? null, deletedAt: user.deletedAt ?? null });
  }
}
