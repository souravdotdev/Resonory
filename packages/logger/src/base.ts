import pino, { type DestinationStream, type Logger } from "pino";
import pretty from "pino-pretty";
import { loggerEnv } from "./env";
import { redactSensitiveFields } from "./redact";

export interface CreateLoggerOptions {
  /** Which app produced the log line; tagged onto every line as `app`. */
  name: string;
  /** Extra fields bound to every line this logger (or its children) write. */
  bindings?: Record<string, unknown>;
}

function resolveLevel(): string {
  if (loggerEnv.LOG_LEVEL) return loggerEnv.LOG_LEVEL;
  return loggerEnv.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * The one factory every app's composition root calls once to build its
 * logger. `destination` is a test-only escape hatch (an in-memory stream);
 * production/dev code never passes it, so output always goes to stdout —
 * pretty-printed in local development, plain NDJSON in production and test.
 */
export function createLogger(
  { name, bindings }: CreateLoggerOptions,
  destination: DestinationStream = process.stdout,
): Logger {
  const options: pino.LoggerOptions = {
    level: resolveLevel(),
    base: { app: name, ...bindings },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      log: (object) => redactSensitiveFields(object),
    },
  };

  if (loggerEnv.NODE_ENV === "development") {
    return pino(options, pretty({ colorize: true, sync: true, destination }));
  }

  return pino(options, destination);
}
