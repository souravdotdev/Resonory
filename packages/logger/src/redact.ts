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
 * The two header paths Fastify's own `req` serializer puts a cookie and an
 * authorization header at, for pino's own `redact.paths` option.
 */
export const redactPaths = ["req.headers.cookie", "req.headers.authorization"];

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

  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key) ? CENSORED : redactValue(val, seen);
    }
    return result;
  }

  return value;
}
