# Documentation

Reference docs for the `resonory` monorepo, covering what's been set up and why.

- [Architecture](./architecture.md) — monorepo layout, tech stack, and the architectural pattern in use
- [Clean Architecture](./clean-architecture.md) — the API's layers (domain/application/interface/infrastructure), the DI container, and where new code should go
- [Getting Started](./getting-started.md) — local setup: prerequisites, install, running services
- [Environment Variables](./environment-variables.md) — every variable, which app/package needs it, and why
- [Database](./database.md) — schema, data model, and the Drizzle migration workflow
- [API](./api.md) — HTTP endpoint reference for `apps/api`
- [Tags](./tags.md) — how Users tag their Items: the model, every rule and why, concurrency, what's not built yet, and open questions
- [Queue & Background Jobs](./queue.md) — BullMQ-backed Item processing and AI tagging, on two queues with a worker each: type detection, oEmbed, Thumbnails
- [Content capture](./content-capture.md) — server-fetched vs. browser-extension-captured content: the old path, the new path, and where they diverge/reconverge
- [Browser extension](./extension.md) — how `apps/extension` captures and saves a page, its permissions, and configuring the API address (`WXT_API_URL`)
- [Logging](./logging.md) — the shared Pino logger, its redaction and verbosity rules, and each app's correlation convention
- [Code Quality](./code-quality.md) — linting, formatting, and type-checking conventions
- [Security](./security.md) — CORS, helmet, rate limiting, `apps/web`'s response headers, secret scanning (gitleaks), and Dependabot
- [Deploying the waitlist page](./deploy-waitlist.md) — the Vercel checklist for `apps/waitlist`: root directory, `DATABASE_URL`, the migration, domains and analytics
- [Testing](./testing.md) — Vitest setup, what's tested and why, and the fakes-over-mocking-libraries convention

Each file stands on its own — start with whichever is relevant, or read [Architecture](./architecture.md) first for the full-picture view.

## Diagrams

- [System context](./diagrams/system-context.excalidraw): every app, store and external service, and how they talk to each other
- [Workspace dependencies](./diagrams/workspace-dependencies.excalidraw): which apps depend on which `@resonory/*` packages, at runtime and dev-only
- [Clean Architecture layers](./diagrams/clean-architecture-layers.excalidraw): the API's and the worker's four layers, the inward dependency rule, the lint guard and the composition roots
- [Context map](./diagrams/context-map.excalidraw): the Auth, Items and Waitlist contexts and how they relate
- [Database ER](./diagrams/database-er.excalidraw): every table with its keys, unique constraints and domain columns, the four enums, and how the tables link
- [Item lifecycle](./diagrams/item-lifecycle.excalidraw): how the processing worker moves an Item between Processing, Ready and Failed, including retries, the stuck-Item sweep and late jobs
- [Worker job routing](./diagrams/worker-job-routing.excalidraw): how the processing worker routes Item processing queue jobs by name, its retry defaults, the failed set and slimming, and the Item tagging queue's own retries
- [Save-an-Item sequence](./diagrams/save-item-sequence.excalidraw): both callers, the browser extension with an API key and the web app with a Session, through `POST /items`, Processing and AI tagging
- [Extension capture](./diagrams/extension-capture.excalidraw): what a toolbar-icon click does, from the missing-API-key popup through the size-cap fallback and YouTube captions to the badge
- [Item type detection](./diagrams/item-type-detection.excalidraw): the order the processing worker tries signals in to type an Item, and which fetch failures retry
- [Thumbnail pipeline](./diagrams/thumbnail-pipeline.excalidraw): how a Thumbnail is picked, downloaded, resized and stored once per canonical final URL, and the API's 1-hour URL signer that nothing calls yet
- [AI tagging](./diagrams/ai-tagging.excalidraw): what the model sees, how its answer is cleaned and applied, the Tag limits, and why Tags may not appear
- [Sign-in sequence](./diagrams/sign-in-sequence.excalidraw): Google sign-in through Better Auth on the API, the sign-in decision, the shared Session cookie and how protected routes answer 401 or 403
- [Waitlist signup](./diagrams/waitlist-signup.excalidraw): how the waitlist route stores a Waitlist Entry and sends the Welcome email after the response

Every diagram in `docs/diagrams/` follows these conventions:

- **Current state only.** A diagram shows the code as it is today. A partly built flow shows only its built part; nothing planned is drawn.
- **Colors by context.** Auth is blue, Items is green and Waitlist is purple. Apps and packages that span several contexts are white, infrastructure and external services are neutral grey, and notes and decisions are yellow. System-level diagrams carry a small legend.
- **Gaps and failures are red.** A gap, meaning something called that doesn't exist, is a red dashed arrow. An error or failure path is a solid red arrow. An error or failure outcome box (Failed, a 400, a rethrow) gets a solid red outline and keeps the fill its context gives it, white when it spans several contexts.
- **Only red dashed arrows are gaps.** Light grey dashed lines are a sequence diagram's lifelines. Dark dashed arrows are replies or dev-only dependencies, as each diagram's labels or legend say.
- **Glossary terms.** Labels use the terms from the [glossaries](../GLOSSARY-MAP.md); code names appear only as secondary text.
- **Editable files.** Each diagram is an Excalidraw scene (`.excalidraw`). Open it in [excalidraw.com](https://excalidraw.com) or the VS Code Excalidraw extension, edit it, and save it back under the same kebab-case name.
