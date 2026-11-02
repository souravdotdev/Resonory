const CENSORED = "[Redacted]";

// A safety net on top of (never instead of) call-site discipline: a log call
// that passes a raw `Error` (instead of `describeError(error)`) is still
// wrong, even with this redaction configured.
const SENSITIVE_KEYS = new Set([
  "cookie",
  "authorization",
  "email",
  "token",
  "apiKey",
  "api_key",
  "password",
  "serviceRoleKey",
  "service_role_key",
  "secret",
]);

/**
 * Masks any field literally named cookie/authorization/email/token/apiKey/
 * password/a service-role-style secret, wherever it appears in a logged
 * object, at any depth. Pino's own `redact` option (fast-redact) only
 * reaches one level of nesting per wildcard path, so this walks the object
 * directly instead; it's applied via `formatters.log` in `base.ts`.
 */
export function redactSensitiveFields<T>(value: T): T {
  return redactValue(value, new WeakSet()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) return value;
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = SENSITIVE_KEYS.has(key) ? CENSORED : redactValue(val, seen);
    }
    return result;
  }

  return value;
}

/**
 * True only for an object literal (or one with no prototype): `{ ... }`,
 * `Object.create(null)`, or JSON-shaped data from `Object.entries`'s point of
 * view. A class instance — a `Date`, an `Error`, a `Map`, a `Buffer`, or a
 * framework's own `Request`/`Reply` wrapper — exposes its real data through
 * accessors on its prototype, which `Object.entries` can't see; walking one
 * as if it were a plain record silently turns it into `{}`. Those are left
 * alone instead, unwalked and unmasked, for pino's own key-specific
 * serializers (`req`, `res`, `err`) or `util.inspect`/`JSON.stringify` to
 * handle as they already do.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
