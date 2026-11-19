# Worker concurrency, rate limit and lock duration are configured per queue from the environment

How hard each worker works used to be fixed in code: one job at a time, no rate limit, BullMQ's default lock duration. An operator on a paid model plan could not let Tagging go faster, one on Groq's free tier could not keep it under the per-minute cap, and nobody could clear a backlog without a redeploy. Each worker now reads its own optional concurrency, rate limit (a maximum and a window) and lock duration from the environment at startup, in a group per queue (`ITEM_PROCESSING_*`, `ITEM_TAGGING_*`; see [Environment variables](../../../environment-variables.md#appsworkerenv)), and logs the settings it runs with. Unset, each worker behaves exactly as before (concurrency 1, no limiter, BullMQ's lock duration), and a bad value stops it at startup with an error naming the variable, so a typo is never silently ignored. This builds on [ADR 0005](./0005-processing-and-ai-tagging-have-their-own-queues-and-worker-processes.md): the two queues are tuned independently. Implementation: issues #188 and #189 (parent #187).

## Considered Options

- **Constants in code**: what we had. Simple, but every change is a code change and a redeploy, and the right numbers depend on the operator's model plan and hardware, which the code cannot know.
- **One shared setting for both workers**: fewer variables, but Processing (page fetches, Supabase) and Tagging (a model API) have different limits, and tuning one would move the other, undoing the isolation of ADR 0005.
- **Dynamic or remote config** (a table, Redis or a flag service, read while running): changes apply without a restart, but it needs somewhere to store and edit the settings, and a bad value would surface mid-run instead of at startup. A restart is cheap here.
- **A Groq-sized default limit for Tagging**: it would stop the free-tier `429`s out of the box, but it would change behaviour on deploy and throttle operators on a paid plan who never asked for it. Groq's numbers are documented as an example, not a default.
- **Honouring `Retry-After`** (pausing the queue when a model answers `429`): it would react to the real limit instead of a guess, but it means classifying `429`s and reading a header through the model client. The configured limiter plus Tag Item's existing retries (30 s, then 60 s) are enough for now.

## Consequences

- A rate limit is a property of the queue, so it applies across every worker consuming it: a second tagging worker shares the limit rather than doubling it.
- There is no cap on concurrency. Each process has one Postgres connection pool (the library's default of 10), so concurrency above that waits for a connection until the operator raises the pool as well. The page fetcher and Thumbnail pipeline have no concurrency limit of their own.
- A longer lock duration keeps a slow job from being treated as stalled; at higher concurrency a job that starves the event loop can miss renewing its lock, so the two are tuned together.
- Job retries are unchanged, and a model `429` is still not classified.
