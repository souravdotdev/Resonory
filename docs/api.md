# API

Fastify server in `apps/api`, organised by layer (see [Clean Architecture](./clean-architecture.md)). Entry point `src/index.ts`, which builds the DI container (`src/di/container.ts`) and passes it to `buildApp` (`src/app.ts`).

Base URL locally: `http://localhost:4000` (from `PORT` in `apps/api/.env`).

Today the API serves `GET /health`, Better Auth's routes under `/api/auth/*`, `GET /me`, `POST /items` (save a URL), `GET /tags` (list the User's Tags), `POST /items/:itemId/tags` (tag an Item by name) and `DELETE /items/:itemId/tags/:tagId` (take a Tag off an Item). The other Item endpoints (list, search, retry, delete) come in later specs, built on the same schema wiring described below.

## Shared schemas: one definition of every request and response

Every request and response between `apps/web` and `apps/api` is defined once, as a zod schema in `packages/shared` (see [ADR 0001](./adr/0001-shared-zod-contracts-package.md)). The package depends only on zod and has one entry point per context:

- `@resonory/shared/schemas/common`: shared shapes, such as the error envelope (`ErrorResponseSchema`).
- `@resonory/shared/schemas/auth`: the signed-in User (`MeResponseSchema`).
- `@resonory/shared/schemas/items`: Item shapes, such as the create-Item input (`CreateItemSchema`), the Item card (`ItemCardSchema`) and the Tag requests and responses (`ItemTagParamsSchema`, `TagItemSchema`, `UntagItemParamsSchema`, `ItemTagsResponseSchema`, `ListTagsResponseSchema`).
- `@resonory/shared/schemas/queue`: not HTTP, but the API ↔ worker contract: the Items queue name, the Process Item job name and its payload (see [Queue](./queue.md)).

Naming: zod schemas end in `Schema` and their inferred TypeScript types drop the suffix (for example `CreateItemSchema` / `CreateItemInput`, `ItemCardSchema` / `ItemCard`). A plain `Item` is always the domain entity in `apps/api/src/domain/entities`, never a wire shape.

The same schema is used on both sides. For example, the web save form validates a pasted link with `CreateItemSchema` before it calls the API, and `POST /items` validates the request body with that schema too. So the form and the server never disagree. That schema trims the link, requires a valid `http` or `https` URL, and allows at most 2048 characters.

### How the API uses the schemas

`buildApp` (`apps/api/src/app.ts`), before any plugin or route is registered:

- Sets the [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod) validator and serializer compilers, and types the app with `ZodTypeProvider`.
- Calls `registerErrorMiddleware(app)` (`src/interface/middleware/error.middleware.ts`), which installs the global error handler and not-found handler, so every error uses the envelope below.

A route file in `src/interface/routes/` declares its schemas in `schema`, and Fastify then:

- **Validates the request** (`body`, `querystring`, `params`) before the handler runs. `request.body` and the others are typed from the schema.
- **Serializes the response** through the schema declared for that status code. This acts as an output filter: any field that the handler returns but the schema doesn't declare is stripped. So adding a field to an entity never leaks it onto the wire.

The handler itself only calls a controller (`src/interface/controllers/`), which the container builds and which calls a use case:

```ts
app.post(
  "/items",
  {
    preHandler: authMiddleware(container),
    schema: {
      body: CreateItemSchema,
      response: { 201: CreateItemResponseSchema },
    },
  },
  // request.body is CreateItemInput, already trimmed and validated
  (request, reply) => itemsController().create(request, reply),
);
```

## Error envelope

Every API error is sent in one envelope (`ErrorResponseSchema` in `@resonory/shared/schemas/common`), so the web app can handle errors in one place:

```json
{ "error": { "code": "validation_failed", "message": "The request is invalid", "details": [] } }
```

`details` is optional. When present it is a list of `{ path, message }` issues, one per field that failed validation. The `code` is always one of:

| Code                | Status | When                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `validation_failed` | 400    | The request doesn't match its schema. `details` lists each issue as `{ "path": "/url", "message": "Enter a valid http(s) link" }`. A Tag name that breaks the Tag name rule also uses it, with no `details` and a fixed message stating the rule (see [`POST /items/:itemId/tags`](#post-itemsitemidtags)). Other client errors (malformed JSON, an unsupported content type, ...) also use this code, with a fixed generic message. |
| `unauthorized`      | 401    | The request isn't authenticated.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `forbidden`         | 403    | The request is authenticated, but not in a way the route accepts: an API key on a [web-Session-only route](#web-session-only-routes).                                                                                                                                                                                                                                                                                                |
| `not_found`         | 404    | The route or resource doesn't exist.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `item_tag_limit`    | 409    | Tagging an Item that already has its 20 Tags (the AI's count too) with a Tag that isn't on it yet. See [Tag limits](#tag-limits).                                                                                                                                                                                                                                                                                                    |
| `user_tag_limit`    | 409    | Tagging an Item with a new Tag when the User already has 1,000 Tags. See [Tag limits](#tag-limits).                                                                                                                                                                                                                                                                                                                                  |
| `rate_limited`      | 429    | The client went over the rate limit (100 requests a minute, see [Security](./security.md)).                                                                                                                                                                                                                                                                                                                                          |
| `internal`          | 500    | Anything unexpected. The message is always generic: the real error is logged on the server and never sent to the client, so no stack traces, SQL or internal hostnames leak.                                                                                                                                                                                                                                                         |

Use cases throw domain errors from `apps/api/src/domain/errors` (`AppError` and its subclasses), never HTTP errors. The error middleware maps each error's code to a status: `INVALID_TAG_NAME` → 400, `UNAUTHORIZED` and `USER_PERMANENTLY_DELETED` → 401, `FORBIDDEN` → 403, `NOT_FOUND` → 404, `ITEM_TAG_LIMIT` and `USER_TAG_LIMIT` → 409, `REPOSITORY_ERROR` → 500. Each is then sent with a fixed, safe envelope code and message: the domain code's own when it has one (`clientErrorsByCode`: the two Tag limits share 409 but get `item_tag_limit` and `user_tag_limit`; `INVALID_TAG_NAME` keeps `validation_failed` but gets a message stating the Tag name rule), otherwise its status's. A domain error's own message never reaches the client.

Example validation failure:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request is invalid",
    "details": [{ "path": "/url", "message": "Enter a valid http(s) link" }]
  }
}
```

## Auth

Three pieces, all in `apps/api`: Better Auth's own routes under `/api/auth/*` (signing in and out), the auth middleware every protected route runs, and `GET /me`, the first protected route.

### Better Auth: `/api/auth/*`

[Better Auth](https://better-auth.com) runs inside the API (`src/infrastructure/auth/createAuth.ts`) and serves every route under `/api/auth/*` (GET and POST), mounted by `authRoutes` (`src/interface/routes/auth.routes.ts`) before any other route ([ADR 0003](./adr/0003-auth-lives-on-the-api-with-subdomain-cookies.md), [Clean Architecture](./clean-architecture.md#the-four-layers)). These routes answer in Better Auth's own shapes, not the shared error envelope. The ones that matter today:

- `POST /api/auth/sign-in/social` with `{ "provider": "google", "callbackURL": "<web origin>/..." }` starts a Google sign-in and returns the Google URL to send the browser to. Any other provider gets `404 PROVIDER_NOT_FOUND`, a `scopes` field asking Google for more gets a 400, and a `callbackURL` outside the web origin is refused.
- `GET /api/auth/callback/google` is where Google sends the browser back. On the first sign-in it creates the User and their Sign-in identity. Then, before creating the Session, its session-create hook (`src/infrastructure/auth/signInHook.ts`) runs `AdmitSignInUseCase`, which applies the sign-in rules (Auth ADR 0001):
  - an active User signs in, and their Display name and avatar are refreshed from Google (a missing Google name keeps the current one; the email captured at sign-up never changes);
  - a User deleted within the 30-day Grace period is restored (the deletion time is cleared), and signs in;
  - a User deleted longer ago is refused: no Session is created, and the browser is sent to the error URL (the sign-in's `errorCallbackURL`, or Better Auth's `/api/auth/error`) with `?error=USER_PERMANENTLY_DELETED&error_description=This account was permanently deleted…`.

  On success it sets the Session cookie and redirects to the `callbackURL`.

- `GET /api/auth/get-session` and `POST /api/auth/sign-out` read and end the current Session.
- `GET /api/auth/ok` is a liveness check: `{ "ok": true }`.

They're rate-limited more strictly than the rest of the API (see [Security](./security.md#rate-limiting)).

### The auth middleware

Every protected route declares `preHandler: authMiddleware(container)` (`src/interface/middleware/auth.middleware.ts`) and its controller reads the caller with `signedInUser(request)`. No route parses identity headers itself. The middleware runs `ResolveSignedInUserUseCase`, which asks the `ISessionProvider` port for the User of the request's Session cookie (in production `BetterAuthSessionProvider`, which checks the `sessions` table on every request), then:

- no valid Session (missing, expired, revoked or forged cookie) → `401 unauthorized`;
- a Session whose User has a deletion time → `401 unauthorized`, so a deleted User's old Sessions stop working;
- otherwise the domain User is attached to the request and the route runs.

The use case throws `UnauthorizedError`, which the error middleware sends as 401 in the standard envelope:

```json
{ "error": { "code": "unauthorized", "message": "You need to sign in to do that" } }
```

The web app's requests (`apps/web/src/lib/api.ts`) send the Session cookie with `credentials: "include"`; no identity header is sent or read.

### Web-Session-only routes

Better Auth turns a valid `x-api-key` header (the extension's) into a Session just as it does a cookie, so the auth middleware accepts both. Routes only the web app may call (today the [Tag routes](#tags)) declare `preHandler: sessionOnlyAuthMiddleware(container)` instead. It runs the same guard first, so a request with no Session, or an invalid key, still gets `401 unauthorized`; then a request carrying an `x-api-key` header is refused with `ForbiddenError`, sent as:

```json
{ "error": { "code": "forbidden", "message": "That isn't allowed with these credentials" } }
```

It looks at the header because Better Auth's api-key plugin reads only that header and uses the key over any Session cookie sent alongside it.

### `GET /me`

The signed-in User, in `MeResponseSchema` (`@resonory/shared/schemas/auth`). Protected by the auth middleware. Served by `meRoutes` → `MeController` → `GetMeUseCase`, which turns the domain User into `MeOutput`.

```
200 OK
{
  "id": "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  "displayName": "Sourav Sanjay",
  "email": "sourav@example.com",
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

`avatarUrl` is null when the User has no Google photo. Without a valid Session it's `401 unauthorized`.

## Items

### `POST /items`

Saves a pasted URL as an Item for the signed-in User and answers straight away with its Item card, still Processing and with no Item type. Protected by the auth middleware — a Session cookie or (issue #143) an `x-api-key` header, resolved identically (see [Security](./security.md#authentication)). Served by `itemsRoutes` → `ItemsController` → `SaveItemUseCase`, which:

1. stores the Item through the `IItemRepository` port (`DrizzleItemRepository`): status `processing`, type null, the Source URL exactly as pasted after trimming. Source URLs aren't unique, so saving the same one twice creates two Items;
2. enqueues its Processing through the `IQueueProvider` port (`BullMqQueueProvider`): a Process Item job with `{ itemId, userId, html, captions }` on the Items queue (see [Queue](./queue.md#captured-content-the-browser-extension-path));
3. returns the Item card (`CreateItemResponseSchema`, the same shape as `ItemCardSchema`).

```
POST /items
{ "url": "https://youtu.be/dQw4w9WgXcQ" }

201 Created
{
  "id": "3b241101-e2bb-4255-8caf-4136c566a962",
  "sourceUrl": "https://youtu.be/dQw4w9WgXcQ",
  "type": null,
  "status": "processing",
  "title": null,
  "description": null,
  "thumbnailUrl": null,
  "failureMessage": null,
  "createdAt": "2026-04-01T00:00:00.000Z",
  "tags": []
}
```

**`html`** (`CreateItemSchema`, optional): the page's already-rendered HTML, as the browser extension's background script captures it from the active tab on a toolbar click (clones of `document.head`, stripped of styles, `noscript`, `template` and every script but JSON-LD, and of `document.body`, stripped of scripts, styles, `noscript`, `svg`, `iframe` and `template`, both without inline `data:` URIs; or the head alone when that's still over the cap; the worker reads the head for the title, description and Thumbnail and the body for the Item's Text) and sends alongside the URL, at most 5 Mi characters (`MAX_HTML_LENGTH`) — never typed by hand, and additive: a caller sending only `url`, as the web app still does, behaves exactly as before this field existed. Carried unchanged through the enqueued job to the worker, which then skips its own fetch for that Item entirely (see [Queue](./queue.md#captured-content-the-browser-extension-path)).

**`captions`** (`CreateItemSchema`, optional): a YouTube video's plain caption text, read by the extension from the tab the User is watching ([Browser extension](./extension.md#youtube-captions)), at most 1 Mi characters (`MAX_CAPTIONS_LENGTH`). Additive like `html`, and carried unchanged through the enqueued job; the worker uses it as the Item's Text ahead of the page's, and only alongside captured `html`: captions without it are ignored (see [Queue](./queue.md#text)).

- No valid Session or API key → `401 unauthorized`. The User always comes from the authenticated identity, never from the body.
- A missing URL, one that isn't `http`/`https`, or one over 2048 characters → `400 validation_failed` with the issue at `/url`.
- Captured content over 5 Mi characters → `400 validation_failed` with the issue at `/html`. The route sets its own request-body limit (`CREATE_ITEM_BODY_LIMIT`, derived from the schema's caps: two bytes per character plus headroom), so an oversized capture reaches the schema instead of getting Fastify's 413 from its 1 MiB default. Captions over 1 Mi characters are the same `400`, at `/captions`.
- More than 30 saves in a minute → `429 rate_limited`. `POST /items` replaces the app-wide 100 a minute with 30, counted per API key (`x-api-key`, hashed), or per client IP for a request without one, and every IP gets at most 60 a minute whatever keys it sends (see [Security](./security.md#rate-limiting)).
- If the job can't be enqueued (Redis is down), the request fails with `500 internal`. The Item is already stored and stays Processing; there is no retry endpoint yet.

## Tags

Tag routes are served by `tagsRoutes` (`src/interface/routes/tags.routes.ts`) → `TagsController`. Only the web app's Session may call them: each declares `preHandler: sessionOnlyAuthMiddleware(container)`, which runs the auth middleware and then refuses a request authenticated by an API key (see [Web-Session-only routes](#web-session-only-routes)). Tag names are slugs: a name is reduced by `slugifyTagName` (`src/domain/rules/tagName.ts`), and that slug is both stored and shown, so "Machine Learning", "machine learning" and "machine-learning" are the same Tag. Tags and their links live in the `tags` and `item_tags` tables, behind the `ITagRepository` port (`DrizzleTagRepository`).

### `GET /tags`

Lists every one of the signed-in User's Tags, for a Tag picker. Served by `ListTagsUseCase` over `ITagRepository.listForUser`. Tags come most recently used first: by the latest time each was put on any Item, by the AI or the User (the latest `item_tags.created_at`). A Tag on no Items falls back to its own `created_at`, and ties go by Tag name. Upgrading an AI link to `user` keeps the link's `created_at`, so it doesn't count as a new use. The query returns at most 1,000 Tags, a User's Tag limit. There's no search parameter: matching what the User types (contains, on the slugified input) is the client's job.

The response is `ListTagsResponseSchema` (`ListedTagSchema[]`): each Tag's id and Tag name, nothing else.

```
GET /tags

200 OK
[
  { "id": "0f1e2d3c-4b5a-4968-8776-655443322110", "name": "machine-learning" },
  { "id": "9d7c3f0e-5b1a-4e2f-8c6d-1a2b3c4d5e6f", "name": "spaced-repetition" }
]
```

- A User with no Tags → `200 OK` with `[]`.
- No valid Session (or an invalid API key) → `401 unauthorized`.
- A valid API key → `403 forbidden`.

### `POST /items/:itemId/tags`

Tags one of the signed-in User's Items by name. Served by `TagItemUseCase`, which:

1. reduces `name` to its Tag name; one that's empty once reduced, or longer than 50 characters, is an `InvalidTagNameError`;
2. finds the Item through `IItemRepository.findById(userId, itemId)`; no Item, or another User's, is a `NotFoundError`, checked before any Tag is created;
3. refuses a Tag that isn't on the Item yet when the Item already has 20 (`ItemTagLimitError`), checked before any Tag is created (see [Tag limits](#tag-limits));
4. finds the User's Tag with that name, or creates it (`ITagRepository.findOrCreate`); a new Tag when the User already has 1,000 is a `UserTagLimitError`. Creates for one User take turns behind a lock on their `users` row, and the insert still relies on `tags_user_id_name_unique` (`ON CONFLICT DO NOTHING`, then a select), so two requests creating the same new Tag at once end with one Tag;
5. puts it on the Item with Tag source `user` (`ITagRepository.applyAsUser`): a link the AI made becomes `user`, and a link the User already made is left as it is, so repeating the call changes nothing;
6. returns the Item's Tags after the change (`ItemTagsResponseSchema`: `ItemCardTagSchema[]`), oldest link first.

```
POST /items/3b241101-e2bb-4255-8caf-4136c566a962/tags
{ "name": "Machine Learning" }

200 OK
[
  { "id": "9d7c3f0e-5b1a-4e2f-8c6d-1a2b3c4d5e6f", "name": "spaced-repetition", "source": "ai" },
  { "id": "0f1e2d3c-4b5a-4968-8776-655443322110", "name": "machine-learning", "source": "user" }
]
```

- No valid Session (or an invalid API key) → `401 unauthorized`.
- A valid API key → `403 forbidden`, and nothing changes.
- An `itemId` that isn't a uuid, or a `name` that isn't text → `400 validation_failed` with the issues in `details`.
- A name that's empty or over 50 characters once slugified → `400 validation_failed` with the message "A Tag name must be 1 to 50 characters of letters, digits, +, #, . or - (spaces become hyphens, other characters are dropped)" and no `details`, and no Tag is created.
- An Item that doesn't exist or belongs to another User → `404 not_found`, never 403, so the API doesn't reveal what exists.
- A Tag that isn't on the Item yet, when the Item already has 20 Tags → `409 item_tag_limit` ("An Item can have at most 20 Tags"), and nothing changes.
- A new Tag, when the User already has 1,000 Tags → `409 user_tag_limit` ("You can have at most 1,000 Tags"), and no Tag is created.

#### Tag limits

An Item can have at most 20 Tags (`MAX_TAGS_PER_ITEM`), and a User at most 1,000 (`MAX_TAGS_PER_USER`), both in `src/domain/rules/tagLimits.ts`. They're abuse guards that real use won't reach. Tags the AI put on an Item count towards its 20. Re-adding a Tag that's already on the Item counts against neither limit and still succeeds, and a User at 1,000 Tags can still put any of them on any Item.

The adapter enforces each limit in the same transaction as the write it guards, behind a row lock (`SELECT ... FOR NO KEY UPDATE`, which still lets foreign keys to the row be checked): `findOrCreate` locks the User's `users` row, then counts and inserts; `applyAsUser` locks the Item's `items` row, then counts and links. Concurrent requests therefore take turns and can't race past either limit. Two gaps remain:

- the database itself doesn't cap an Item's Tags: only the lock and count do. So any other writer that puts Tags on an Item (the AI tagger, once it exists) must, in the same transaction as its insert, take the same lock on the Item's `items` row (`SELECT ... FOR NO KEY UPDATE`) and count the Item's links before linking, or concurrent writes can push an Item past 20;
- `TagItemUseCase` checks the Item's count early so a full Item doesn't leave a new Tag behind, but two requests racing for an Item's last slot both pass that check: the loser gets `409 item_tag_limit`, and the new Tag it created stays on no Item, like any Tag taken off its last Item.

### `DELETE /items/:itemId/tags/:tagId`

Takes one of the signed-in User's Tags off one of their Items, whoever put it there (the AI or the User). Served by `UntagItemUseCase`, which:

1. finds the Item through `IItemRepository.findById(userId, itemId)` and the Tag through `ITagRepository.findById(userId, tagId)`; either missing, or another User's, is a `NotFoundError`;
2. deletes the link (`ITagRepository.removeFromItem`), whatever its Tag source. The Tag itself is kept, even when it's then on no Items, so it can be reused. A Tag that isn't on the Item is left alone, so removing it again is harmless;
3. returns the Item's remaining Tags (`ItemTagsResponseSchema`), oldest link first.

Whether the AI may later put back a Tag the User removed is undecided; for now removal only deletes the link.

```
DELETE /items/3b241101-e2bb-4255-8caf-4136c566a962/tags/0f1e2d3c-4b5a-4968-8776-655443322110

200 OK
[
  { "id": "9d7c3f0e-5b1a-4e2f-8c6d-1a2b3c4d5e6f", "name": "spaced-repetition", "source": "ai" }
]
```

- No valid Session (or an invalid API key) → `401 unauthorized`.
- A valid API key → `403 forbidden`, and nothing changes.
- An `itemId` or `tagId` that isn't a uuid → `400 validation_failed`.
- An Item or Tag that doesn't exist or belongs to another User → `404 not_found`, never 403.

## `GET /health`

Liveness check.

```
200 OK
{ "status": "ok" }
```
