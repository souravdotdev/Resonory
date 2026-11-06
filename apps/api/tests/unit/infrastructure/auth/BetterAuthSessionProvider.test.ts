import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";
import {
  BetterAuthSessionProvider,
  type SessionApi,
  type SessionUser,
} from "@/infrastructure/auth/BetterAuthSessionProvider";

// The User as Better Auth's get-session returns them, read from the users row.
const sessionUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "user-1",
  name: "Sourav Sanjay",
  email: "sourav@example.com",
  emailVerified: true,
  image: "https://lh3.googleusercontent.com/a/avatar",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-02T00:00:00.000Z"),
  deletedAt: null,
  ...overrides,
});

// A fake Better Auth instance: only the server API's get-session.
const authReturning = (session: { user: SessionUser } | null): { api: SessionApi } => ({
  api: { getSession: vi.fn(async () => session) },
});

const headers = new Headers({ cookie: "better-auth.session_token=abc" });

describe("BetterAuthSessionProvider", () => {
  it("asks Better Auth for the Session of the request's headers", async () => {
    const auth = authReturning(null);

    await new BetterAuthSessionProvider(auth).resolve(headers);

    expect(auth.api.getSession).toHaveBeenCalledWith({ headers });
  });

  it("is null when Better Auth finds no valid Session", async () => {
    await expect(
      new BetterAuthSessionProvider(authReturning(null)).resolve(headers),
    ).resolves.toBeNull();
  });

  it("is the Session's User as the domain User", async () => {
    const provider = new BetterAuthSessionProvider(authReturning({ user: sessionUser() }));

    await expect(provider.resolve(headers)).resolves.toEqual({
      id: "user-1",
      name: "Sourav Sanjay",
      email: "sourav@example.com",
      profileImg: "https://lh3.googleusercontent.com/a/avatar",
      deletedAt: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });
  });

  // Unlike a missing/malformed Session cookie, a present-but-invalid API key header
  // makes Better Auth's getSession *throw* an APIError (spec #144) rather than
  // answer null. That's normalized here to the same null every other case above
  // already produces, so a bad API key is refused the same way (401, via
  // ResolveSignedInUserUseCase) as a missing/invalid Session is today.
  it("is null, not thrown, when Better Auth rejects an invalid API key header", async () => {
    const auth: { api: SessionApi } = {
      api: {
        getSession: vi.fn(async () => {
          throw new APIError("FORBIDDEN", { message: "Invalid API key.", code: "INVALID_API_KEY" });
        }),
      },
    };

    await expect(new BetterAuthSessionProvider(auth).resolve(headers)).resolves.toBeNull();
  });

  it("still throws an error that isn't Better Auth's own APIError", async () => {
    const auth: { api: SessionApi } = {
      api: {
        getSession: vi.fn(async () => {
          throw new Error("the database is unreachable");
        }),
      },
    };

    await expect(new BetterAuthSessionProvider(auth).resolve(headers)).rejects.toThrow(
      "the database is unreachable",
    );
  });

  it("carries a deleted User's deletion time, and a missing avatar as null", async () => {
    const deletedAt = new Date("2026-05-01T00:00:00.000Z");
    const provider = new BetterAuthSessionProvider(
      authReturning({ user: sessionUser({ image: undefined, deletedAt }) }),
    );

    await expect(provider.resolve(headers)).resolves.toMatchObject({ profileImg: null, deletedAt });
  });
});
