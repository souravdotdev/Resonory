# Processing and AI tagging have their own queues and worker processes

Processing (fetching a page, typing the Item, keeping a Thumbnail) and AI tagging (sending an excerpt to a third-party model) used to share one queue and one worker process, so a slow or hung model call held the worker's single job slot that Processing also needs, and a crash, out-of-memory kill or hang in either took the other down. They now have an Item processing queue and an Item tagging queue (`item-processing`, `item-tagging`), each consumed by its own worker process built from the same codebase, so tagging being slow, misconfigured or down leaves Items becoming Ready exactly as before. Each queue carries one job type, so there is no job-name routing. Implementation: issue #183.

## Considered Options

- **One queue, one worker**: the least to run, but it is what coupled them. A limiter or a higher concurrency would help, but BullMQ's apply to the whole queue and a crash still takes both down.
- **Two queues, two BullMQ Workers in one process**: each queue gets its own retry and backoff settings and its own job slot, but a crash, memory blow-up or event-loop hang still stops both, and the processing worker would carry the AI client while the tagging worker carried the page fetcher.

## Consequences

- Two processes to deploy, run, monitor and restart instead of one. Locally `pnpm dev` starts both; in production each is its own service with its own start command (`start:processing`, `start:tagging`); there is no combined `start`, because a shell running both would hide one worker crashing and may not forward SIGTERM to both.
- Each worker holds only what it uses: the processing worker boots without any AI configuration, the tagging worker without the page fetcher.
- Failure behaviour is unchanged: a Process Item job out of attempts marks its Item Failed, a Tag Item job's final failure only logs.
- The old `items` queue is retired with no compatibility consumer, as Resonory has no Users yet. Drain or flush it before deploying the new API and workers, or its jobs are stranded.
- A single processing worker can still be slowed by its own page fetches; this separates tagging from Processing, not Processing from itself.
