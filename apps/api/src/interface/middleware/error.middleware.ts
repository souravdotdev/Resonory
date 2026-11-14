import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import type { ErrorCode, ErrorResponse } from "@resonory/shared/schemas/common";
import { AppError, type AppErrorCode } from "@/domain/errors";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import { MAX_TAG_NAME_LENGTH } from "@/domain/rules/tagName";

type SafeError = { code: ErrorCode; message: string };

// Every status maps to a fixed, safe message: domain messages, Fastify's own
// error messages and anything thrown with a statusCode never reach the client.
const clientErrors: Partial<Record<number, SafeError>> = {
  401: { code: "unauthorized", message: "You need to sign in to do that" },
  403: { code: "forbidden", message: "That isn't allowed with these credentials" },
  404: { code: "not_found", message: "That resource doesn't exist" },
  429: { code: "rate_limited", message: "Too many requests, please try again later" },
};
// Domain codes that share a status but mean different things to a client get
// their own code and message, chosen ahead of the status's. A code can also keep
// the status's client code and only say what the client can fix (the Tag name rule).
const clientErrorsByCode: Partial<Record<AppErrorCode, SafeError>> = {
  INVALID_TAG_NAME: {
    code: "validation_failed",
    message:
      `A Tag name must be 1 to ${MAX_TAG_NAME_LENGTH} characters of letters, digits, +, #, . or - ` +
      "(spaces become hyphens, other characters are dropped)",
  },
  ITEM_TAG_LIMIT: {
    code: "item_tag_limit",
    message: `An Item can have at most ${MAX_TAGS_PER_ITEM} Tags`,
  },
  USER_TAG_LIMIT: {
    code: "user_tag_limit",
    message: `You can have at most ${MAX_TAGS_PER_USER.toLocaleString("en-US")} Tags`,
  },
};
const otherClientError: SafeError = {
  code: "validation_failed",
  message: "The request could not be processed",
};
const serverError: SafeError = {
  code: "internal",
  message: "Something went wrong on our side",
};

// The HTTP meaning of each domain error code; 5xx codes are logged and sent as `internal`.
const statusOfCode: Record<AppErrorCode, number> = {
  INVALID_TAG_NAME: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  USER_PERMANENTLY_DELETED: 401,
  FORBIDDEN: 403,
  ITEM_TAG_LIMIT: 409,
  USER_TAG_LIMIT: 409,
  REPOSITORY_ERROR: 500,
};

function sendError(
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ErrorResponse = { error: { code, message, details } };
  return reply.code(status).send(body);
}

/**
 * The one place errors become responses, all in the shared
 * `{ error: { code, message, details? } }` envelope:
 * - request validation failures → 400 `validation_failed` with the issues;
 * - domain errors (`AppError`) → the status their code maps to, with that code's
 *   own client code and message when it has one (the Tag limits, the Tag name
 *   rule), else the status's;
 * - Fastify's own 4xx (rate limit, bad content type, ...) → their status;
 * - anything else → a generic 500 `internal`, with the error only in the logs;
 * - unknown routes → 404 `not_found`.
 *
 * Register it before plugins and routes so they inherit the handlers.
 */
export function registerErrorMiddleware(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues = error.validation.map(({ instancePath, message }) => ({
        path: instancePath,
        message,
      }));
      return sendError(reply, 400, "validation_failed", "The request is invalid", issues);
    }

    const status = error instanceof AppError ? statusOfCode[error.code] : error.statusCode;

    if (status !== undefined && status >= 400 && status < 500) {
      const byCode = error instanceof AppError ? clientErrorsByCode[error.code] : undefined;
      const { code, message } = byCode ?? clientErrors[status] ?? otherClientError;
      return sendError(reply, status, code, message);
    }

    request.log.error(error);
    return sendError(reply, 500, serverError.code, serverError.message);
  });

  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, "not_found", `Route ${request.method} ${request.url} not found`),
  );
}
