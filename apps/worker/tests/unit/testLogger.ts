import type { Logger } from "@resonory/logger";

/** One call recorded by a `RecordingLogger`: its level, bound fields, logged fields, and message. */
export interface RecordedLog {
  level: "info" | "warn" | "error";
  /** Fields bound via `.child()` all the way from the root logger to the one that logged this. */
  bindings: Record<string, unknown>;
  /** The structured fields passed to this specific call, `{}` when none were. */
  fields: Record<string, unknown>;
  msg: string;
}

/**
 * A minimal stand-in for `@resonory/logger`'s `Logger`, satisfying just the
 * methods the worker calls: `.info`/`.warn`/`.error` and `.child`. Every call,
 * from the root logger or any logger `.child()` derived from it, is recorded
 * into the same shared `logs` array, with that call's full chain of bound
 * fields attached — so a test can hold only the root logger and still see
 * everything a job-scoped child logged.
 */
export type RecordingLogger = Pick<Logger, "info" | "warn" | "error" | "child"> & {
  logs: RecordedLog[];
};

function record(
  level: RecordedLog["level"],
  bindings: Record<string, unknown>,
  logs: RecordedLog[],
) {
  return (fieldsOrMsg: Record<string, unknown> | string, maybeMsg?: string) => {
    const [fields, msg] =
      typeof fieldsOrMsg === "string" ? [{}, fieldsOrMsg] : [fieldsOrMsg, maybeMsg ?? ""];
    logs.push({ level, bindings, fields, msg });
  };
}

function makeRecordingLogger(
  bindings: Record<string, unknown>,
  logs: RecordedLog[],
): RecordingLogger {
  return {
    logs,
    info: record("info", bindings, logs) as Logger["info"],
    warn: record("warn", bindings, logs) as Logger["warn"],
    error: record("error", bindings, logs) as Logger["error"],
    child: ((childBindings: Record<string, unknown>) =>
      makeRecordingLogger({ ...bindings, ...childBindings }, logs)) as unknown as Logger["child"],
  };
}

/** A fresh `RecordingLogger` with no bound fields and an empty `logs` array. */
export function createRecordingLogger(): RecordingLogger {
  return makeRecordingLogger({}, []);
}
