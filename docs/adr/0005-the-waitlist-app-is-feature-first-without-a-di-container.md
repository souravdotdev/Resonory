# The waitlist app is feature-first, without a DI container

ADR 0004's shape (layer-first folders, `@injectable()` use-case classes, an InversifyJS container) applies to `apps/api` and `apps/worker`, the apps that hold the product's domain and grow a use case at a time. `apps/waitlist` is a marketing page with one endpoint, `POST /api/waitlist`, so it is organised by feature instead: `src/waitlist/` holds the request schema, a small `WaitlistStore` port (`join`, `count`, `markWelcomeEmailed`) with its Drizzle adapter, an `EmailSender` port with an AutoSend adapter and a logging one, and `createJoinWaitlistHandler`, a plain factory over those two ports (plus a `defer` hook for after-response work) that returns the route handler. `src/waitlist/index.ts` is the composition root: it builds the store and the sender and is the only file that knows which adapter backs each port. We traded the consistency of one shape across every app for an app a reader can take in at a glance: for a single endpoint, the layers, tokens and container would be more code than the feature itself, and the port alone already gives the seam the tests need (the handler is tested against an in-memory store).

## Considered Options

- **Follow ADR 0004 in full**: the same shape as the API, so code and reviewers move between apps unchanged. But one endpoint would need four layer folders, a token file, a container, `reflect-metadata` and decorator settings in a Next.js build, all to wire one handler to one store.
- **No port at all** (the route calls Drizzle directly): the least code, but the handler could then only be tested against a real database, and the "never reveal whether an email is already on the list" rule would live in SQL rather than in a contract the handler is written against.

## Consequences

- If the waitlist app grows real domain logic (more endpoints, rules shared with the API, Users), revisit this decision rather than growing the feature folder into an ad hoc layer structure; at that point ADR 0004's shape is the default.
- The waitlist app still uses the shared error envelope (`ErrorResponseSchema` from `@resonory/shared`, see ADR 0001), so clients see one error shape across apps.
