# Exhausted jobs stay in BullMQ's failed set, with no dead letter queue

A Process Item or Tag Item job that runs out of attempts stays in BullMQ's failed set (kept to the last 5000, `removeOnFail`), and what a User sees is the Item's own state: a Process Item job's last failure marks its Item Failed, and a Tag Item job's final failure only logs, leaving the Item Ready without AI Tags. Resonory does not move exhausted jobs to a separate dead letter queue or table. The failed set already holds each job with its data and its failure reason, and the Item's status already says what happened, so a second place to look would add a thing to run and monitor without a way to use it yet.

## Considered Options

- **A dead letter queue or table**: exhausted jobs moved to their own queue or a database table, to inspect and replay. Not worth it while nothing replays a job: there is no retry endpoint, a Failed Item is saved again by its User, and a replayed Process Item job has lost its captured page content (`html` and `captions` are dropped from a finished job's data).
- **Keeping failed jobs longer**: raising `removeOnFail` or adding age-based retention. Cheap, but there is no current need to look back further than the last 5000 failures, and Redis keeps every kept job.

## Consequences

- To see why a job failed, look at the failed set or the worker's log: every failed attempt is logged with its job, attempt number and reason. The reason is not stored on the Item.
- Revisit this when something needs to replay a failed job (a retry endpoint, or an operator tool), when failures must be kept longer than the failed set's cap, or when a failure must page someone rather than show in the logs.
- Items that never get a final failure at all (a lost job, a failed final-failure step) are not a dead letter problem: the stuck-Item sweep ends them as Failed.
