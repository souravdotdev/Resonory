/**
 * What the waitlist logs about an error: its name and, when it has one, its
 * code, never its message. A database driver's message can carry the SQL and
 * its parameters (the visitor's address), so the logs name no one.
 *
 * This has moved to `@resonory/logger`'s `describeError` (unchanged
 * behavior). This local copy and its import in `handler.ts` still exist here
 * and will be deleted/repointed by a follow-up ticket (#133).
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  const code = [error, error.cause].map((e) => (e as { code?: unknown } | undefined)?.code);
  const found = code.find((value): value is string => typeof value === "string");
  return found ? `${error.name} (${found})` : error.name;
}
