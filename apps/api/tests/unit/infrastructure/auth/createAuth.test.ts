import { Socket } from "node:net";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@resonory/db/schema";
import { createAuth, type AuthConfig, type AuthDeps } from "@/infrastructure/auth/createAuth";
import { BetterAuthSessionProvider } from "@/infrastructure/auth/BetterAuthSessionProvider";

const config: AuthConfig = {
  secret: "a-test-secret-that-is-at-least-32-chars",
  baseURL: "http://localhost:4000",
  webOrigin: "http://localhost:3000",
  google: { clientId: "google-client-id", clientSecret: "google-client-secret" },
};

// No database behind it: these tests only reach code paths that fail or
// answer before Better Auth touches a table.
// Never reached: no test here gets as far as creating a Session.
const deps: AuthDeps = { admitSignIn: { execute: async () => {} } };

const buildAuth = (overrides: Partial<AuthConfig> = {}) =>
  createAuth(drizzle.mock({ schema }), { ...config, ...overrides }, deps);

function post(auth: ReturnType<typeof buildAuth>, path: string, body: object) {
  return auth.handler(
    new Request(`${config.baseURL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: config.webOrigin },
      body: JSON.stringify({ callbackURL: `${config.webOrigin}/`, ...body }),
    }),
  );
}

describe("createAuth", () => {
  it("offers no sign-in provider other than Google", async () => {
    const res = await post(buildAuth(), "/sign-in/social", { provider: "github" });

    expect(res.status).toBe(404);
  });

  it.each(["/sign-in/social", "/link-social"])(
    "refuses a %s request that asks Google for extra scopes",
    async (path) => {
      const res = await post(buildAuth(), path, {
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      });

      expect(res.status).toBe(400);
    },
  );

  it("asks Google only for the User's identity: openid, email and profile", async () => {
    const context = await buildAuth().$context;
    const google = context.socialProviders.find((provider) => provider.id === "google")!;

    const url = await google.createAuthorizationURL({
      state: "state",
      codeVerifier: "a-code-verifier-that-is-long-enough-for-pkce-0123456789",
      redirectURI: `${config.baseURL}/api/auth/callback/google`,
    });

    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([
      "email",
      "openid",
      "profile",
    ]);
  });

  it("keeps the Session cookie on the API's own host when no cookie domain is configured", async () => {
    const context = await buildAuth().$context;

    expect(context.authCookies.sessionToken.attributes.domain).toBeUndefined();
  });

  it("shares the Session cookie across subdomains when a cookie domain is configured", async () => {
    const context = await buildAuth({ cookieDomain: "resonory.com" }).$context;

    expect(context.authCookies.sessionToken.attributes.domain).toBe("resonory.com");
  });
});

// Everything above never reaches a table (drizzle.mock() answers before any
// query runs). API-key creation and resolution are the real `@better-auth/api-key`
// plugin reading and writing real rows, so they're tested against the real local
// Postgres (the same one `docker-compose.yml` starts for local dev), the one
// place in this suite that needs it. Skipped wherever that database isn't
// reachable (e.g. CI, which runs no Postgres service) rather than failing — the
// property this covers is also exercised at the unit level, with a fake Better
// Auth, by BetterAuthSessionProvider.test.ts.
const REAL_DATABASE_URL = "postgres://postgres:postgres@localhost:5433/resonory";

function isReachable(url: string): Promise<boolean> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(Number(port), hostname);
  });
}

const databaseReachable = await isReachable(REAL_DATABASE_URL);

// Signs a Session token exactly as Better Auth's cookie does: HMAC-SHA256 over the
// token with the auth secret, base64-encoded, appended as `<token>.<signature>`,
// then URI-encoded — so a directly-inserted `sessions` row can be presented as a
// real, valid Session cookie, the same as one a browser would hold after sign-in.
async function signedSessionCookie(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `better-auth.session_token=${encodeURIComponent(`${token}.${base64Signature}`)}`;
}

describe.skipIf(!databaseReachable)("createAuth, with a real database (API key auth)", () => {
  const client = postgres(REAL_DATABASE_URL);
  const db = drizzle(client, { schema });
  const auth = createAuth(db, config, deps);

  beforeEach(async () => {
    // RESTART IDENTITY isn't needed (every id is a uuid default), but CASCADE
    // clears Sign-in identities/API keys that reference a truncated User.
    await client`truncate table ${client("api_keys")}, ${client("sessions")}, ${client("users")} cascade`;
  });

  afterAll(async () => {
    await client.end();
  });

  // A real signed-in User and Session, inserted directly (as the rows a real
  // Google sign-in would leave behind), bypassing the sign-in hook itself — this
  // suite is about API-key resolution, not sign-in decisions (those are
  // `signInHook.test.ts`'s job).
  async function seedSignedInUser() {
    const [user] = await db
      .insert(schema.users)
      .values({ name: "Sourav Sanjay", email: `${crypto.randomUUID()}@example.com` })
      .returning();
    if (user === undefined) throw new Error("insert returned no row");
    const token = `session-token-${crypto.randomUUID()}`;
    await db
      .insert(schema.sessions)
      .values({ userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    const cookie = await signedSessionCookie(token, config.secret);
    return { user, cookie };
  }

  it("creates no API key as a side effect of a Session existing (no auto-issuance)", async () => {
    const { user } = await seedSignedInUser();

    const keys = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.referenceId, user.id));

    expect(keys).toEqual([]);
  });

  it("resolves the same signed-in User from a created API key as it does from its own Session cookie", async () => {
    const { user, cookie } = await seedSignedInUser();

    const viaCookie = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(viaCookie?.user.id).toBe(user.id);

    const created = await auth.api.createApiKey({ headers: new Headers({ cookie }), body: {} });

    const viaApiKey = await auth.api.getSession({
      headers: new Headers({ "x-api-key": created.key }),
    });
    expect(viaApiKey?.user.id).toBe(user.id);
    expect(viaApiKey?.user.email).toBe(user.email);
  });

  it("prefixes a created key's raw value with resk_", async () => {
    const { cookie } = await seedSignedInUser();
    const created = await auth.api.createApiKey({ headers: new Headers({ cookie }), body: {} });

    expect(created.key.startsWith("resk_")).toBe(true);
  });

  it("never re-exposes a created key's raw value from a later get or list call", async () => {
    const { cookie } = await seedSignedInUser();
    const created = await auth.api.createApiKey({ headers: new Headers({ cookie }), body: {} });
    expect(created.key).toEqual(expect.any(String));

    const fetched = await auth.api.getApiKey({
      headers: new Headers({ cookie }),
      query: { id: created.id },
    });
    const listed = await auth.api.listApiKeys({ headers: new Headers({ cookie }) });

    expect(fetched).not.toHaveProperty("key");
    expect(listed.apiKeys.length).toBeGreaterThan(0);
    for (const key of listed.apiKeys) expect(key).not.toHaveProperty("key");
  });

  it("rejects a request with a missing, malformed, or invalid API key header the same way an invalid Session is", async () => {
    const provider = new BetterAuthSessionProvider(auth);

    await expect(provider.resolve(new Headers())).resolves.toBeNull();
    await expect(provider.resolve(new Headers({ "x-api-key": "" }))).resolves.toBeNull();
    await expect(
      provider.resolve(new Headers({ "x-api-key": "not-a-real-key-at-all" })),
    ).resolves.toBeNull();
  });
});
