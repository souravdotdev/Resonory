/**
 * What the project logs about an error: its name and, when it has one, its
 * code, never its message. A database driver's message can carry the SQL and
 * its parameters (e.g. a visitor's email address), so the logs name no one.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  const code = [error, error.cause].map((e) => (e as { code?: unknown } | undefined)?.code);
  const found = code.find((value): value is string => typeof value === "string");
  return found ? `${error.name} (${found})` : error.name;
}
