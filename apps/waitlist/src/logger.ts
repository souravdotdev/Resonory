import { createLogger, type Logger } from "@resonory/logger";

/**
 * The one shared logger for this app. `apps/waitlist` has no DI container
 * (ADR 0005), and it's a single low-traffic endpoint, so a plain exported
 * singleton is enough — no per-request correlation id is threaded through it.
 */
export const logger: Logger = createLogger({ name: "waitlist" });
