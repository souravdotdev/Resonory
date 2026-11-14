import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { Container } from "inversify";
import { z } from "zod";
import { MeResponseSchema } from "@resonory/shared/schemas/auth";
import { ErrorResponseSchema } from "@resonory/shared/schemas/common";
import {
  CreateItemResponseSchema,
  ItemTagsResponseSchema,
  ListTagsResponseSchema,
  MAX_CAPTIONS_LENGTH,
  MAX_HTML_LENGTH,
} from "@resonory/shared/schemas/items";
import { buildApp } from "@/app";
import { GetMeUseCase } from "@/application/use-cases/auth/GetMeUseCase";
import { ResolveSignedInUserUseCase } from "@/application/use-cases/auth/ResolveSignedInUserUseCase";
import { SaveItemUseCase } from "@/application/use-cases/items/SaveItemUseCase";
import { TagItemUseCase } from "@/application/use-cases/tags/TagItemUseCase";
import { ListTagsUseCase } from "@/application/use-cases/tags/ListTagsUseCase";
import { UntagItemUseCase } from "@/application/use-cases/tags/UntagItemUseCase";
import type { Item } from "@/domain/entities/Item";
import type { User } from "@/domain/entities/User";
import {
  ForbiddenError,
  InvalidTagNameError,
  NotFoundError,
  RepositoryError,
  UnauthorizedError,
  UserPermanentlyDeletedError,
} from "@/domain/errors";
import type { IQueueProvider } from "@/domain/providers/IQueueProvider";
import type { ISessionProvider } from "@/domain/providers/ISessionProvider";
import type { IItemRepository, NewItem } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import { TOKENS } from "@/di/tokens";
import type { Env } from "@/env";
import { IN_MEMORY_RATE_LIMITS, type RateLimitRedis } from "@/rate-limit-store";
import { ItemsController } from "@/interface/controllers/ItemsController";
import { MeController } from "@/interface/controllers/MeController";
import { TagsController } from "@/interface/controllers/TagsController";
import { authMiddleware, signedInUser } from "@/interface/middleware/auth.middleware";
import type { AuthRequestHandler } from "@/interface/routes/auth.routes";
import { CREATE_ITEM_IP_LIMIT } from "@/interface/routes/items.routes";
import { anItem, taggingInMemory } from "./fakes/tagging";

const env: Env = {
  PORT: 4000,
  HOST: "127.0.0.1",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:4000",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  WEB_ORIGIN: "https://allowed.example.com",
  EXTENSION_ORIGIN: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
};

// An active User with a Google avatar; each test overrides only what it's about.
const user = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  name: "Sourav Sanjay",
  email: "sourav@example.com",
  profileImg: "https://lh3.googleusercontent.com/a/avatar",
  deletedAt: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  ...overrides,
});

// A hand-written fake: the request's Session belongs to `found`, or there's none.
const sessionsReturning = (found: User | null): ISessionProvider => ({
  resolve: vi.fn(async () => found),
});

// An in-memory Item repository: every save is a new Processing Item with the next id.
function itemsInMemory() {
  const saved: Item[] = [];
  const repository: IItemRepository = {
    create: async ({ userId, sourceUrl }: NewItem) => {
      const createdAt = new Date("2026-04-01T00:00:00.000Z");
      const item: Item = {
        id: `00000000-0000-4000-8000-00000000000${saved.length + 1}`,
        userId,
        sourceUrl,
        type: null,
        status: "processing",
        title: null,
        description: null,
        thumbnailKey: null,
        extractedText: null,
        createdAt,
        updatedAt: createdAt,
      };
      saved.push(item);
      return item;
    },
    findById: async (userId: string, itemId: string) =>
      saved.find((item) => item.id === itemId && item.userId === userId) ?? null,
  };
  return { repository, saved };
}

const queueRecording = (): IQueueProvider => ({ enqueueProcessItem: vi.fn(async () => {}) });

interface TestDoubles {
  items?: IItemRepository;
  queue?: IQueueProvider;
  tags?: ITagRepository;
}

// A test container: the real app, use cases and controllers, with fakes for
// Better Auth, the Session lookup (by default no request has a valid Session),
// the Item and Tag repositories and the queue. The rate-limit store is explicitly in-memory (no Redis).
function testContainer(
  sessions: ISessionProvider = sessionsReturning(null),
  {
    items = itemsInMemory().repository,
    queue = queueRecording(),
    tags = taggingInMemory().tagRepository,
  }: TestDoubles = {},
) {
  const container = new Container();
  container.bind(TOKENS.Env).toConstantValue(env);
  container.bind<RateLimitRedis>(TOKENS.RateLimitRedis).toConstantValue(IN_MEMORY_RATE_LIMITS);
  container.bind<AuthRequestHandler>(TOKENS.Auth).toConstantValue({
    handler: async () => Response.json({ ok: true }),
  });
  container.bind<ISessionProvider>(TOKENS.SessionProvider).toConstantValue(sessions);
  container.bind(TOKENS.ResolveSignedInUserUseCase).to(ResolveSignedInUserUseCase);
  container.bind(TOKENS.GetMeUseCase).to(GetMeUseCase);
  container.bind(TOKENS.MeController).to(MeController);
  container.bind<IItemRepository>(TOKENS.ItemRepository).toConstantValue(items);
  container.bind<IQueueProvider>(TOKENS.QueueProvider).toConstantValue(queue);
  container.bind(TOKENS.SaveItemUseCase).to(SaveItemUseCase);
  container.bind(TOKENS.ItemsController).to(ItemsController);
  container.bind<ITagRepository>(TOKENS.TagRepository).toConstantValue(tags);
  container.bind(TOKENS.TagItemUseCase).to(TagItemUseCase);
  container.bind(TOKENS.UntagItemUseCase).to(UntagItemUseCase);
  container.bind(TOKENS.TagsController).to(TagsController);
  container.bind(TOKENS.ListTagsUseCase).to(ListTagsUseCase);
  return container;
}

const withSessionCookie = { cookie: "better-auth.session_token=abc" };

describe("the API app", () => {
  it("answers GET /health", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("sets standard security headers from helmet", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeTruthy();
  });

  it("never reflects a requester's origin that isn't on the allow-list", async () => {
    const app = await buildApp(testContainer());

    // With an allow-list `origin` config (an array of exact origins, not a
    // single static string), @fastify/cors sets this header only when the
    // request's Origin matches one of the allowed origins, reflecting that
    // matched value — never the requester's own, unmatched Origin, and never
    // present at all for a mismatch. See the two tests below for the matched case.
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.example.com" },
    });

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("lets the web origin send and receive the Session cookie", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://allowed.example.com",
        "access-control-request-method": "POST",
      },
    });

    expect(res.headers["access-control-allow-origin"]).toBe("https://allowed.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("lets the extension's origin send and receive credentials too, alongside the web origin", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
        "access-control-request-method": "POST",
      },
    });

    expect(res.headers["access-control-allow-origin"]).toBe(
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects a non-web, non-extension origin: no Access-Control-Allow-Origin at all", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "chrome-extension://some-other-unrelated-extension-id",
        "access-control-request-method": "POST",
      },
    });

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("limits each client to 100 requests a minute app-wide", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["x-ratelimit-limit"]).toBe("100");
  });

  it("refuses to build without a rate-limit store bound, rather than quietly counting in memory", async () => {
    const container = testContainer();
    container.unbind(TOKENS.RateLimitRedis);

    await expect(buildApp(container)).rejects.toThrow();
  });

  it("sends unknown routes as 404 not_found in the error envelope", async () => {
    const app = await buildApp(testContainer());

    const res = await app.inject({ method: "GET", url: "/nope" });

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
  });
});

describe("GET /me", () => {
  it("is 401 unauthorized without a valid Session", async () => {
    const app = await buildApp(testContainer(sessionsReturning(null)));

    const res = await app.inject({ method: "GET", url: "/me" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });

  it("is 401 unauthorized for a deleted User's Session", async () => {
    const deleted = user({ deletedAt: new Date("2026-05-01T00:00:00.000Z") });
    const app = await buildApp(testContainer(sessionsReturning(deleted)));

    const res = await app.inject({ method: "GET", url: "/me", headers: withSessionCookie });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });

  it("returns the signed-in User in the me contract, without internals", async () => {
    const app = await buildApp(testContainer(sessionsReturning(user())));

    const res = await app.inject({ method: "GET", url: "/me", headers: withSessionCookie });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: "user-1",
      displayName: "Sourav Sanjay",
      email: "sourav@example.com",
      avatarUrl: "https://lh3.googleusercontent.com/a/avatar",
      createdAt: "2026-04-01T00:00:00.000Z",
    });
    expect(MeResponseSchema.safeParse(res.json()).success).toBe(true);
  });

  it("returns a null avatar for a User without a Google photo", async () => {
    const app = await buildApp(testContainer(sessionsReturning(user({ profileImg: null }))));

    const res = await app.inject({ method: "GET", url: "/me", headers: withSessionCookie });

    expect(res.statusCode).toBe(200);
    expect(res.json().avatarUrl).toBeNull();
  });
});

describe("POST /items", () => {
  const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const signedIn = () => sessionsReturning(user({ id: USER_ID }));
  const save = (app: Awaited<ReturnType<typeof buildApp>>, payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/items", headers: withSessionCookie, payload });

  it("is 401 unauthorized without a valid Session, and saves nothing", async () => {
    const { repository, saved } = itemsInMemory();
    const queue = queueRecording();
    const app = await buildApp(
      testContainer(sessionsReturning(null), { items: repository, queue }),
    );

    const res = await app.inject({
      method: "POST",
      url: "/items",
      payload: { url: "https://example.com/post" },
    });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
    expect(saved).toHaveLength(0);
    expect(queue.enqueueProcessItem).not.toHaveBeenCalled();
  });

  it("answers 201 with the Item card: Processing, no Item type, the Source URL as pasted", async () => {
    const app = await buildApp(testContainer(signedIn()));

    const res = await save(app, { url: "  https://youtu.be/dQw4w9WgXcQ?t=42  " });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      sourceUrl: "https://youtu.be/dQw4w9WgXcQ?t=42",
      type: null,
      status: "processing",
      title: null,
      description: null,
      thumbnailUrl: null,
      failureMessage: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      tags: [],
    });
    expect(CreateItemResponseSchema.safeParse(res.json()).success).toBe(true);
  });

  it("limits saves to 30 a minute, while other routes keep 100", async () => {
    const app = await buildApp(testContainer(signedIn()));

    const res = await save(app, { url: "https://example.com/post" });
    const elsewhere = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["x-ratelimit-limit"]).toBe("30");
    expect(elsewhere.headers["x-ratelimit-limit"]).toBe("100");
  });

  it("counts saves per API key: the 31st from one key is 429 rate_limited, another key still saves", async () => {
    const app = await buildApp(testContainer(signedIn()));
    const saveWithKey = (apiKey: string) =>
      app.inject({
        method: "POST",
        url: "/items",
        headers: { "x-api-key": apiKey },
        payload: { url: "https://example.com/post" },
      });

    for (let i = 0; i < 30; i++) await saveWithKey("key_one");
    const limited = await saveWithKey("key_one");
    const otherKey = await saveWithKey("key_two");

    expect(limited.statusCode).toBe(429);
    expect(ErrorResponseSchema.parse(limited.json()).error.code).toBe("rate_limited");
    expect(otherKey.statusCode).toBe(201);
  });

  it("cuts off made-up keys at 60 saves a minute per IP, before auth reads them", async () => {
    const { repository, saved } = itemsInMemory();
    const app = await buildApp(testContainer(sessionsReturning(null), { items: repository }));
    const saveWithKey = (apiKey: string) =>
      app.inject({
        method: "POST",
        url: "/items",
        headers: { "x-api-key": apiKey },
        payload: { url: "https://example.com/post" },
      });

    const answers = [];
    for (let i = 0; i <= CREATE_ITEM_IP_LIMIT; i++) answers.push(await saveWithKey(`made_up_${i}`));
    const limited = answers.at(-1)!;

    expect(answers.slice(0, -1).every((res) => res.statusCode === 401)).toBe(true);
    expect(limited.statusCode).toBe(429);
    expect(ErrorResponseSchema.parse(limited.json()).error.code).toBe("rate_limited");
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(saved).toHaveLength(0);
  });

  it("counts every save toward the IP limit, even one the per-key limit refuses", async () => {
    // The IP check runs first, so a key's refused saves still count from its IP.
    // Run after the per-key check instead, the 10 refused ones below wouldn't, and
    // the 61st save would get the 401 of a made-up key, not 429.
    const app = await buildApp(testContainer(sessionsReturning(null)));
    const saveWithKey = (apiKey: string) =>
      app.inject({
        method: "POST",
        url: "/items",
        headers: { "x-api-key": apiKey },
        payload: { url: "https://example.com/post" },
      });

    const oneKey = [];
    for (let i = 0; i < 40; i++) oneKey.push((await saveWithKey("key_one")).statusCode);
    const otherKeys = [];
    for (let i = 0; i < CREATE_ITEM_IP_LIMIT - 40; i++) {
      otherKeys.push((await saveWithKey(`key_${i}`)).statusCode);
    }
    const sixtyFirst = await saveWithKey("key_fresh");

    expect(oneKey.slice(30).every((status) => status === 429)).toBe(true);
    expect(otherKeys.every((status) => status === 401)).toBe(true);
    expect(sixtyFirst.statusCode).toBe(429);
  });

  describe("behind a proxy", () => {
    const saveFrom = (app: Awaited<ReturnType<typeof buildApp>>, clientIp: string, key: string) =>
      app.inject({
        method: "POST",
        url: "/items",
        remoteAddress: "10.0.0.1",
        headers: { "x-forwarded-for": clientIp, "x-api-key": key },
        payload: { url: "https://example.com/post" },
      });
    const appTrusting = async (trustProxy: Env["TRUST_PROXY"]) => {
      const container = testContainer();
      await container.unbind(TOKENS.Env);
      container.bind(TOKENS.Env).toConstantValue({ ...env, TRUST_PROXY: trustProxy });
      return buildApp(container);
    };

    it("counts each client's IP from X-Forwarded-For when TRUST_PROXY trusts the proxy", async () => {
      const app = await appTrusting("10.0.0.1");

      for (let i = 0; i < CREATE_ITEM_IP_LIMIT; i++) await saveFrom(app, "203.0.113.7", `k${i}`);
      const limited = await saveFrom(app, "203.0.113.7", "another");
      const otherClient = await saveFrom(app, "198.51.100.9", "another");

      expect(limited.statusCode).toBe(429);
      expect(otherClient.statusCode).toBe(401);
    });

    it("ignores X-Forwarded-For without TRUST_PROXY, so a client can't pick its own IP", async () => {
      const app = await appTrusting(undefined);

      for (let i = 0; i < CREATE_ITEM_IP_LIMIT; i++) await saveFrom(app, `203.0.113.${i}`, `k${i}`);
      const limited = await saveFrom(app, "198.51.100.9", "another");

      expect(limited.statusCode).toBe(429);
    });
  });

  it("counts saves without an API key per client IP", async () => {
    const app = await buildApp(testContainer(signedIn()));

    for (let i = 0; i < 30; i++) await save(app, { url: "https://example.com/post" });
    const limited = await save(app, { url: "https://example.com/post" });

    expect(limited.statusCode).toBe(429);
  });

  it("stores the Item for the signed-in User, never one named in the body", async () => {
    const { repository, saved } = itemsInMemory();
    const app = await buildApp(testContainer(signedIn(), { items: repository }));

    await save(app, { url: "https://example.com/post", userId: "someone-else" });

    expect(saved).toEqual([expect.objectContaining({ userId: USER_ID })]);
  });

  it("enqueues a Process Item job with the new Item's id and the User's id", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));

    const res = await save(app, { url: "https://example.com/post" });

    expect(queue.enqueueProcessItem).toHaveBeenCalledWith({
      itemId: res.json().id,
      userId: USER_ID,
    });
  });

  it("enqueues the job with the request's captured page content, unchanged", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));
    const html = "<!doctype html><html><head><title>A page</title></head></html>";

    const res = await save(app, { url: "https://example.com/post", html });

    expect(queue.enqueueProcessItem).toHaveBeenCalledWith({
      itemId: res.json().id,
      userId: USER_ID,
      html,
    });
  });

  it("enqueues a URL-only request without captured content, same as today", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));

    await save(app, { url: "https://example.com/post" });

    const call = (queue.enqueueProcessItem as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.html).toBeUndefined();
  });

  it("saves a captured page over 1 MiB (Fastify's default body limit)", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));
    const html = `<html><body>${"a".repeat(2 * 1024 * 1024)}</body></html>`;

    const res = await save(app, { url: "https://example.com/post", html });

    expect(res.statusCode).toBe(201);
    expect(queue.enqueueProcessItem).toHaveBeenCalledWith(expect.objectContaining({ html }));
  });

  it("saves a captured page at the cap even when every character takes two bytes", async () => {
    const app = await buildApp(testContainer(signedIn()));

    const res = await save(app, {
      url: "https://example.com/post",
      html: "é".repeat(MAX_HTML_LENGTH),
    });

    expect(res.statusCode).toBe(201);
  });

  it("is 400 validation_failed for a captured page over the cap, not a 413", async () => {
    const { repository, saved } = itemsInMemory();
    const app = await buildApp(testContainer(signedIn(), { items: repository }));

    const res = await save(app, {
      url: "https://example.com/post",
      html: "a".repeat(MAX_HTML_LENGTH + 1),
    });

    expect(res.statusCode).toBe(400);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details).toEqual([expect.objectContaining({ path: "/html" })]);
    expect(saved).toHaveLength(0);
  });

  it("enqueues the job with the request's captions, unchanged", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));
    const html = "<html><body>A video page</body></html>";
    const captions = "Hello and welcome to the show.";

    const res = await save(app, { url: "https://www.youtube.com/watch?v=abc", html, captions });

    expect(queue.enqueueProcessItem).toHaveBeenCalledWith({
      itemId: res.json().id,
      userId: USER_ID,
      html,
      captions,
    });
  });

  it("enqueues an html-only request without captions, same as today", async () => {
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { queue }));

    await save(app, { url: "https://example.com/post", html: "<html></html>" });

    const call = (queue.enqueueProcessItem as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.captions).toBeUndefined();
  });

  it("saves a captured page and captions both at their caps, every character two bytes", async () => {
    const app = await buildApp(testContainer(signedIn()));

    const res = await save(app, {
      url: "https://www.youtube.com/watch?v=abc",
      html: "é".repeat(MAX_HTML_LENGTH),
      captions: "é".repeat(MAX_CAPTIONS_LENGTH),
    });

    expect(res.statusCode).toBe(201);
  });

  it("is 400 validation_failed for captions over the cap, not a 413", async () => {
    const { repository, saved } = itemsInMemory();
    const app = await buildApp(testContainer(signedIn(), { items: repository }));

    const res = await save(app, {
      url: "https://www.youtube.com/watch?v=abc",
      captions: "a".repeat(MAX_CAPTIONS_LENGTH + 1),
    });

    expect(res.statusCode).toBe(400);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details).toEqual([expect.objectContaining({ path: "/captions" })]);
    expect(saved).toHaveLength(0);
  });

  it("saves the same URL twice as two Items", async () => {
    const { repository, saved } = itemsInMemory();
    const app = await buildApp(testContainer(signedIn(), { items: repository }));

    const first = await save(app, { url: "https://example.com/post" });
    const second = await save(app, { url: "https://example.com/post" });

    expect([first.statusCode, second.statusCode]).toEqual([201, 201]);
    expect(first.json().id).not.toBe(second.json().id);
    expect(saved).toHaveLength(2);
  });

  it.each([
    ["a missing URL", {}],
    ["a non-http(s) URL", { url: "ftp://example.com/file" }],
    ["something that isn't a URL", { url: "not a link" }],
    ["a URL over 2048 characters", { url: `https://example.com/${"a".repeat(2048)}` }],
  ])("is 400 validation_failed for %s, and saves nothing", async (_case, payload) => {
    const { repository, saved } = itemsInMemory();
    const queue = queueRecording();
    const app = await buildApp(testContainer(signedIn(), { items: repository, queue }));

    const res = await save(app, payload);

    expect(res.statusCode).toBe(400);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details).toEqual([expect.objectContaining({ path: "/url" })]);
    expect(saved).toHaveLength(0);
    expect(queue.enqueueProcessItem).not.toHaveBeenCalled();
  });

  it("is a generic 500 internal when the Processing can't be enqueued", async () => {
    const queue: IQueueProvider = {
      enqueueProcessItem: async () => {
        throw new Error("connect ECONNREFUSED redis.internal:6379");
      },
    };
    const app = await buildApp(testContainer(signedIn(), { queue }));

    const res = await save(app, { url: "https://example.com/post" });

    expect(res.statusCode).toBe(500);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("internal");
    expect(res.body).not.toContain("redis.internal");
  });
});

describe("POST /items/:itemId/tags", () => {
  const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const ITEM_ID = "00000000-0000-4000-8000-000000000001";
  const signedIn = () => sessionsReturning(user({ id: USER_ID }));

  // The signed-in User's Item, and an app over the in-memory Items, Tags and links.
  async function scene(sessions: ISessionProvider = signedIn()) {
    const store = taggingInMemory();
    store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
    const app = await buildApp(
      testContainer(sessions, { items: store.itemRepository, tags: store.tagRepository }),
    );
    const tag = (
      name: unknown,
      itemId = ITEM_ID,
      headers: Record<string, string> = withSessionCookie,
    ) => app.inject({ method: "POST", url: `/items/${itemId}/tags`, headers, payload: { name } });
    return { ...store, app, tag };
  }

  it("answers 200 with the Item's Tags: a new name creates the User's Tag, Tag source user", async () => {
    const { tag, tags, links } = await scene();

    const res = await tag("Machine Learning");

    expect(res.statusCode).toBe(200);
    expect(tags).toEqual([expect.objectContaining({ userId: USER_ID, name: "machine-learning" })]);
    expect(links).toEqual([expect.objectContaining({ itemId: ITEM_ID, source: "user" })]);
    expect(res.json()).toEqual([{ id: tags[0]!.id, name: "machine-learning", source: "user" }]);
    expect(ItemTagsResponseSchema.safeParse(res.json()).success).toBe(true);
  });

  it("reuses the existing Tag for a name differing only in case, spaces or punctuation", async () => {
    const { tag, tags, items } = await scene();
    const otherItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: otherItemId, userId: USER_ID }));
    await tag("Machine Learning");

    const res = await tag("machine_learning!", otherItemId);

    expect(res.statusCode).toBe(200);
    expect(tags).toHaveLength(1);
    expect(res.json()).toEqual([{ id: tags[0]!.id, name: "machine-learning", source: "user" }]);
  });

  it("changes a Tag the AI already put on the Item to Tag source user", async () => {
    const { tag, links, tagRepository, tick } = await scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: memory.id,
      source: "ai",
      createdAt: tick(),
    });

    const res = await tag("memory");

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ id: memory.id, name: "memory", source: "user" }]);
    expect(links).toEqual([expect.objectContaining({ tagId: memory.id, source: "user" })]);
  });

  it("changes nothing and returns the same Tags when repeated", async () => {
    const { tag, tags, links } = await scene();
    const first = await tag("memory");

    const second = await tag("memory");

    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(tags).toHaveLength(1);
    expect(links).toHaveLength(1);
  });

  it("ends with exactly one Tag when two requests create the same new Tag at once", async () => {
    const { tag, tags } = await scene();

    const [first, second] = await Promise.all([tag("Memory"), tag("memory")]);

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(tags).toHaveLength(1);
    expect(first.json()).toEqual(second.json());
  });

  describe("at the Tag limits", () => {
    // Puts `count` of the User's Tags on the Item, named tag-1, tag-2, ...
    async function putTagsOn(
      { tagRepository, links, tick }: Awaited<ReturnType<typeof scene>>,
      count: number,
      source: "ai" | "user" = "user",
    ) {
      for (let n = 1; n <= count; n++) {
        const onItem = await tagRepository.findOrCreate(USER_ID, `tag-${n}`);
        links.push({
          userId: USER_ID,
          itemId: ITEM_ID,
          tagId: onItem.id,
          source,
          createdAt: tick(),
        });
      }
    }

    it("is 409 item_tag_limit for a 21st Tag on an Item, which keeps its 20", async () => {
      const store = await scene();
      await putTagsOn(store, 20);

      const res = await store.tag("one-too-many");

      expect(res.statusCode).toBe(409);
      expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
        code: "item_tag_limit",
        message: "An Item can have at most 20 Tags",
      });
      expect(store.links).toHaveLength(20);
      expect(store.tags.map(({ name }) => name)).not.toContain("one-too-many");
    });

    it("counts the Tags the AI put on the Item towards its 20", async () => {
      const store = await scene();
      await putTagsOn(store, 20, "ai");

      const res = await store.tag("one-too-many");

      expect(res.statusCode).toBe(409);
      expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("item_tag_limit");
    });

    it("answers 200 re-adding a Tag that's already on a full Item", async () => {
      const store = await scene();
      await putTagsOn(store, 20, "ai");

      const res = await store.tag("tag-20");

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(20);
      expect(res.json()).toContainEqual(
        expect.objectContaining({ name: "tag-20", source: "user" }),
      );
    });

    it("is 409 user_tag_limit for a User's 1,001st Tag, and creates no Tag", async () => {
      const store = await scene();
      for (let n = 1; n <= 1000; n++) await store.tagRepository.findOrCreate(USER_ID, `lib-${n}`);

      const res = await store.tag("one-too-many");

      expect(res.statusCode).toBe(409);
      expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
        code: "user_tag_limit",
        message: "You can have at most 1,000 Tags",
      });
      expect(store.tags).toHaveLength(1000);
      expect(store.links).toHaveLength(0);
    });

    it("answers 200 for a User at 1,000 Tags putting one of them on an Item", async () => {
      const store = await scene();
      for (let n = 1; n <= 1000; n++) await store.tagRepository.findOrCreate(USER_ID, `lib-${n}`);

      const res = await store.tag("lib-1");

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([expect.objectContaining({ name: "lib-1", source: "user" })]);
    });
  });

  it.each([
    ["empty", ""],
    ["empty once slugified", "!!! ???"],
    ["over 50 characters once slugified", "a".repeat(51)],
  ])(
    "is 400 validation_failed with the Tag name rule for a name that's %s, and creates no Tag",
    async (_case, name) => {
      const { tag, tags, links } = await scene();

      const res = await tag(name);

      expect(res.statusCode).toBe(400);
      expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
        code: "validation_failed",
        message:
          "A Tag name must be 1 to 50 characters of letters, digits, +, #, . or - " +
          "(spaces become hyphens, other characters are dropped)",
      });
      expect(tags).toHaveLength(0);
      expect(links).toHaveLength(0);
    },
  );

  it("is 400 validation_failed with the issues for a name that isn't text, and creates no Tag", async () => {
    const { tag, tags } = await scene();

    const res = await tag(42);

    expect(res.statusCode).toBe(400);
    const { error } = ErrorResponseSchema.parse(res.json());
    expect(error.code).toBe("validation_failed");
    expect(error.details).toEqual([expect.objectContaining({ path: "/name" })]);
    expect(tags).toHaveLength(0);
  });

  it("is 400 validation_failed for an Item id that isn't a uuid", async () => {
    const { tag } = await scene();

    const res = await tag("memory", "item-1");

    expect(res.statusCode).toBe(400);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("validation_failed");
  });

  it("is 404 not_found for an Item that doesn't exist", async () => {
    const { tag, tags } = await scene();

    const res = await tag("memory", "00000000-0000-4000-8000-000000000099");

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
    expect(tags).toHaveLength(0);
  });

  it("is 404 not_found for another User's Item, never 403", async () => {
    const { tag, tags, items } = await scene();
    const theirItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: theirItemId, userId: "11111111-1111-4111-8111-111111111111" }));

    const res = await tag("memory", theirItemId);

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
    expect(tags).toHaveLength(0);
  });

  it("is 401 unauthorized without a valid Session, and creates no Tag", async () => {
    const { tag, tags } = await scene(sessionsReturning(null));

    const res = await tag("memory", ITEM_ID, {});

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
    expect(tags).toHaveLength(0);
  });

  it("is 403 forbidden for a request authenticated by an API key, and creates no Tag", async () => {
    // Better Auth turns a valid x-api-key into a Session, so the general guard lets it through.
    const { tag, tags } = await scene();

    const res = await tag("memory", ITEM_ID, { "x-api-key": "resk_valid" });

    expect(res.statusCode).toBe(403);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "forbidden",
      message: "That isn't allowed with these credentials",
    });
    expect(tags).toHaveLength(0);
  });

  it("is 401 unauthorized for an invalid API key, same as any request without a Session", async () => {
    const { tag } = await scene(sessionsReturning(null));

    const res = await tag("memory", ITEM_ID, { "x-api-key": "resk_made_up" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });
});

describe("DELETE /items/:itemId/tags/:tagId", () => {
  const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const OTHER_USER_ID = "11111111-1111-4111-8111-111111111111";
  const ITEM_ID = "00000000-0000-4000-8000-000000000001";
  const signedIn = () => sessionsReturning(user({ id: USER_ID }));

  // The signed-in User's Item with their Tag "memory" on it (Tag source user),
  // and an app over the in-memory Items, Tags and links.
  async function scene(sessions: ISessionProvider = signedIn()) {
    const store = taggingInMemory();
    store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
    const memory = await store.tagRepository.findOrCreate(USER_ID, "memory");
    store.links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: memory.id,
      source: "user",
      createdAt: store.tick(),
    });
    const app = await buildApp(
      testContainer(sessions, { items: store.itemRepository, tags: store.tagRepository }),
    );
    const untag = (
      tagId: string,
      itemId = ITEM_ID,
      headers: Record<string, string> = withSessionCookie,
    ) => app.inject({ method: "DELETE", url: `/items/${itemId}/tags/${tagId}`, headers });
    return { ...store, app, memory, untag };
  }

  it("answers 200 with the Item's remaining Tags, and keeps the Tag", async () => {
    const { untag, memory, tags, links, tagRepository, tick } = await scene();
    const sleep = await tagRepository.findOrCreate(USER_ID, "sleep");
    links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: sleep.id,
      source: "ai",
      createdAt: tick(),
    });

    const res = await untag(memory.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ id: sleep.id, name: "sleep", source: "ai" }]);
    expect(ItemTagsResponseSchema.safeParse(res.json()).success).toBe(true);
    expect(links).toEqual([expect.objectContaining({ tagId: sleep.id })]);
    expect(tags.map((tag) => tag.name)).toEqual(["memory", "sleep"]);
  });

  it("takes off a Tag the AI put on, and keeps it though it's on no Items", async () => {
    const { untag, memory, tags, links } = await scene();
    links[0]!.source = "ai";

    const res = await untag(memory.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    expect(links).toHaveLength(0);
    expect(tags).toEqual([memory]);
  });

  it("answers 200 with the Item's Tags, changing nothing, when the Tag isn't on the Item", async () => {
    const { untag, memory, links, tagRepository } = await scene();
    const sleep = await tagRepository.findOrCreate(USER_ID, "sleep");

    const res = await untag(sleep.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ id: memory.id, name: "memory", source: "user" }]);
    expect(links).toHaveLength(1);
  });

  it("is 200 again when repeated, with the Tag already off", async () => {
    const { untag, memory } = await scene();
    await untag(memory.id);

    const res = await untag(memory.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it.each([
    ["the Item id", "item-1", undefined],
    ["the Tag id", undefined, "tag-1"],
  ])("is 400 validation_failed when %s isn't a uuid", async (_case, itemId, tagId) => {
    const { untag, memory, links } = await scene();

    const res = await untag(tagId ?? memory.id, itemId ?? ITEM_ID);

    expect(res.statusCode).toBe(400);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("validation_failed");
    expect(links).toHaveLength(1);
  });

  it("is 404 not_found for an Item that doesn't exist", async () => {
    const { untag, memory } = await scene();

    const res = await untag(memory.id, "00000000-0000-4000-8000-000000000099");

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
  });

  it("is 404 not_found for another User's Item, never 403, and leaves their Tags on it", async () => {
    const { untag, items, links, tagRepository, tick } = await scene();
    const theirItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: theirItemId, userId: OTHER_USER_ID }));
    const theirs = await tagRepository.findOrCreate(OTHER_USER_ID, "memory");
    links.push({
      userId: OTHER_USER_ID,
      itemId: theirItemId,
      tagId: theirs.id,
      source: "user",
      createdAt: tick(),
    });

    const res = await untag(theirs.id, theirItemId);

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
    expect(links).toHaveLength(2);
  });

  it("is 404 not_found for a Tag that doesn't exist", async () => {
    const { untag } = await scene();

    const res = await untag("00000000-0000-4000-9000-000000000099");

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
  });

  it("is 404 not_found for another User's Tag, never 403", async () => {
    const { untag, tagRepository } = await scene();
    const theirs = await tagRepository.findOrCreate(OTHER_USER_ID, "sleep");

    const res = await untag(theirs.id);

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("not_found");
  });

  it("is 401 unauthorized without a valid Session, and removes nothing", async () => {
    const { untag, memory, links } = await scene(sessionsReturning(null));

    const res = await untag(memory.id, ITEM_ID, {});

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
    expect(links).toHaveLength(1);
  });

  it("is 403 forbidden for a request authenticated by an API key, and removes nothing", async () => {
    // Better Auth turns a valid x-api-key into a Session, so the general guard lets it through.
    const { untag, memory, links } = await scene();

    const res = await untag(memory.id, ITEM_ID, { "x-api-key": "resk_valid" });

    expect(res.statusCode).toBe(403);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("forbidden");
    expect(links).toHaveLength(1);
  });
});

describe("GET /tags", () => {
  const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const ITEM_ID = "00000000-0000-4000-8000-000000000001";
  const signedIn = () => sessionsReturning(user({ id: USER_ID }));

  // The signed-in User's Item, and an app over the in-memory Items, Tags and links.
  async function scene(sessions: ISessionProvider = signedIn()) {
    const store = taggingInMemory();
    store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
    const app = await buildApp(
      testContainer(sessions, { items: store.itemRepository, tags: store.tagRepository }),
    );
    const list = (headers: Record<string, string> = withSessionCookie) =>
      app.inject({ method: "GET", url: "/tags", headers });
    const link = (tagId: string, source: "ai" | "user" = "user") =>
      store.links.push({
        userId: USER_ID,
        itemId: ITEM_ID,
        tagId,
        source,
        createdAt: store.tick(),
      });
    return { ...store, app, list, link };
  }

  it("answers 200 with an empty list for a User with no Tags", async () => {
    const { list } = await scene();

    const res = await list();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("answers 200 with every one of the User's Tags and none of another User's", async () => {
    const { list, tagRepository } = await scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    await tagRepository.findOrCreate("11111111-1111-4111-8111-111111111111", "theirs");

    const res = await list();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ id: memory.id, name: "memory" }]);
    expect(ListTagsResponseSchema.safeParse(res.json()).success).toBe(true);
  });

  it("puts the most recently used Tag first, AI or User, and a Tag on no Items by its creation", async () => {
    const { list, tagRepository, link } = await scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    const reading = await tagRepository.findOrCreate(USER_ID, "reading");
    link(reading.id, "user");
    link(memory.id, "ai");
    // Created after both were used, and never put on an Item.
    await tagRepository.findOrCreate(USER_ID, "unused");

    const res = await list();

    expect(res.statusCode).toBe(200);
    expect(res.json().map((tag: { name: string }) => tag.name)).toEqual([
      "unused",
      "memory",
      "reading",
    ]);
  });

  it("is 401 unauthorized without a valid Session", async () => {
    const { list } = await scene(sessionsReturning(null));

    const res = await list({});

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });

  it("is 403 forbidden for a request authenticated by an API key", async () => {
    const { list, tagRepository } = await scene();
    await tagRepository.findOrCreate(USER_ID, "memory");

    const res = await list({ "x-api-key": "resk_valid" });

    expect(res.statusCode).toBe(403);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("forbidden");
  });

  it("is 401 unauthorized for an invalid API key, same as any request without a Session", async () => {
    const { list } = await scene(sessionsReturning(null));

    const res = await list({ "x-api-key": "resk_made_up" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });
});

// The real app plus a test-only protected route that echoes who it sees.
async function appWithProtectedRoute(sessions: ISessionProvider) {
  const container = testContainer(sessions);
  const app = await buildApp(container);
  app.get("/protected", { preHandler: authMiddleware(container) }, async (request) => ({
    userId: signedInUser(request).id,
  }));
  return app;
}

describe("the auth middleware", () => {
  it("refuses a request with no valid Session with 401 unauthorized", async () => {
    const app = await appWithProtectedRoute(sessionsReturning(null));

    const res = await app.inject({ method: "GET", url: "/protected" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });

  it("refuses a deleted User's Session with 401 unauthorized", async () => {
    const deleted = user({ deletedAt: new Date("2026-05-01T00:00:00.000Z") });
    const app = await appWithProtectedRoute(sessionsReturning(deleted));

    const res = await app.inject({ method: "GET", url: "/protected", headers: withSessionCookie });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
  });

  it("lets a valid Session through, and the route sees its User", async () => {
    const app = await appWithProtectedRoute(sessionsReturning(user({ id: "user-42" })));

    const res = await app.inject({ method: "GET", url: "/protected", headers: withSessionCookie });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "user-42" });
  });

  it("hands the request's headers to the session provider", async () => {
    const sessions = sessionsReturning(user());
    const app = await appWithProtectedRoute(sessions);

    await app.inject({ method: "GET", url: "/protected", headers: withSessionCookie });

    const headers = vi.mocked(sessions.resolve).mock.calls[0]![0];
    expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
  });
});

// The real app plus test-only routes: one declaring a body and a response schema,
// and one that throws whatever the test hands it.
async function appWithTestRoutes(thrown: unknown = new Error("unused")) {
  const app = await buildApp(testContainer());
  app.post(
    "/echo",
    {
      schema: {
        body: z.object({ name: z.string().min(1) }),
        response: { 200: z.object({ name: z.string() }) },
      },
    },
    async (request) => ({ name: request.body.name, secret: "internal-only" }),
  );
  app.get("/throws", async () => {
    throw thrown;
  });
  return app;
}

describe("the API's schemas and error envelope", () => {
  it("serializes a valid request through the response schema", async () => {
    const app = await appWithTestRoutes();

    const res = await app.inject({ method: "POST", url: "/echo", payload: { name: "Ada" } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ name: "Ada" });
  });

  it("strips a response field the schema doesn't declare", async () => {
    const app = await appWithTestRoutes();

    const res = await app.inject({ method: "POST", url: "/echo", payload: { name: "Ada" } });

    expect(res.body).not.toContain("secret");
    expect(res.body).not.toContain("internal-only");
  });

  it("rejects invalid input with 400 validation_failed and the issues in details", async () => {
    const app = await appWithTestRoutes();

    const res = await app.inject({ method: "POST", url: "/echo", payload: { name: "" } });

    expect(res.statusCode).toBe(400);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.message).toBe("The request is invalid");
    expect(body.error.details).toEqual([{ path: "/name", message: expect.any(String) }]);
  });

  it("sends an unmapped client error as validation_failed with a generic message, not Fastify's", async () => {
    const app = await appWithTestRoutes();

    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { "content-type": "application/x-secret-format" },
      payload: "name=Ada",
    });

    expect(res.statusCode).toBe(415);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.message).toBe("The request could not be processed");
    expect(res.body).not.toContain("x-secret-format");
  });

  it("turns an unexpected throw into a generic 500 internal without leaking internals", async () => {
    const app = await appWithTestRoutes(new Error("connect ECONNREFUSED db.internal:5432"));

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(500);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "internal",
      message: "Something went wrong on our side",
    });
    expect(res.body).not.toContain("ECONNREFUSED");
    expect(res.body).not.toContain("db.internal");
  });

  it("sends a domain NotFoundError as 404 not_found with a safe message", async () => {
    const app = await appWithTestRoutes(new NotFoundError("Item item-7 is not in table items"));

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "not_found",
      message: "That resource doesn't exist",
    });
  });

  it("sends a domain UnauthorizedError as 401 unauthorized with a safe message", async () => {
    const app = await appWithTestRoutes(new UnauthorizedError());

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "unauthorized",
      message: "You need to sign in to do that",
    });
  });

  it("sends a domain ForbiddenError as 403 forbidden with a safe message", async () => {
    const app = await appWithTestRoutes(new ForbiddenError("POST /x takes only a web Session"));

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(403);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "forbidden",
      message: "That isn't allowed with these credentials",
    });
  });

  it("sends an InvalidTagNameError as 400 validation_failed with the Tag name rule, not its message", async () => {
    const app = await appWithTestRoutes(new InvalidTagNameError("too-long"));

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(400);
    expect(ErrorResponseSchema.parse(res.json()).error).toEqual({
      code: "validation_failed",
      message:
        "A Tag name must be 1 to 50 characters of letters, digits, +, #, . or - " +
        "(spaces become hyphens, other characters are dropped)",
    });
  });

  it("sends a permanently deleted User as 401 unauthorized without the User id", async () => {
    const app = await appWithTestRoutes(new UserPermanentlyDeletedError("user-9"));

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(401);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("unauthorized");
    expect(res.body).not.toContain("user-9");
  });

  it("sends a RepositoryError as a generic 500 internal without its cause", async () => {
    const app = await appWithTestRoutes(
      new RepositoryError("Saving the User failed", {
        cause: new Error('relation "users" does not exist'),
      }),
    );

    const res = await app.inject({ method: "GET", url: "/throws" });

    expect(res.statusCode).toBe(500);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe("internal");
    expect(res.body).not.toContain("Saving the User");
    expect(res.body).not.toContain("users");
  });
});
