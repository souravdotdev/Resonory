import { createLogger, describeError, type Logger } from "@resonory/logger";

/**
 * The one shared logger for this app. `apps/waitlist` has no DI container
 * (ADR 0005), and it's a single low-traffic endpoint, so a plain exported
 * singleton is enough — no per-request correlation id is threaded through it.
 */
export const logger: Logger = createLogger({ name: "waitlist" });

/**
 * Logs a caught `error` at `error` level, in the one shape every call site
 * here should use: `err` holds `describeError`'s safe string, never the raw
 * Error. Pino's own `err` serializer calls `.message`/`.stack`, which is
 * exactly the leak `describeError` exists to prevent. Do not "simplify" a
 * call site back to `err: error`.
 */
export function logSafeError(logger: Logger, error: unknown, message: string): void {
  logger.error({ err: describeError(error) }, message);
}
