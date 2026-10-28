import type { ErrorCode, ErrorResponse } from "@resonory/shared/schemas/common";
import { HONEYPOT_FIELD, JoinWaitlistRequestSchema, SERVER_ERROR_MESSAGE } from "./request";
import type { EmailSender } from "./email-sender";
import { describeError } from "./log-error";
import type { WaitlistStore } from "./store";
import { buildWelcomeEmail } from "./welcome-email";

/** An error in the shared envelope (`ErrorResponseSchema` in @resonory/shared). */
function errorResponse(status: number, code: ErrorCode, message: string) {
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

function isJson(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function filledHoneypot(body: unknown): boolean {
  if (typeof body !== "object" || body === null || !(HONEYPOT_FIELD in body)) return false;
  const value = body[HONEYPOT_FIELD];
  return typeof value === "string" ? value.trim() !== "" : value != null;
}

export interface JoinWaitlistDependencies {
  store: WaitlistStore;
  emailSender: EmailSender;
  /** Runs work after the response has gone back (Next's `after`). */
  defer: (task: () => Promise<void>) => void;
}

/**
 * Sends the Welcome email and records that the provider accepted it. Runs
 * after the response, so a failure is logged and goes no further: the visitor
 * is already on the list, and an unrecorded send can be re-sent later.
 */
async function sendWelcomeEmail(
  { store, emailSender }: JoinWaitlistDependencies,
  email: string,
): Promise<void> {
  try {
    // A skipped send (no provider configured) is not recorded as sent.
    if ((await emailSender.send(buildWelcomeEmail(email))) === "skipped") return;
  } catch (error) {
    console.error("Could not send the welcome email:", describeError(error));
    return;
  }

  try {
    await store.markWelcomeEmailed(email);
  } catch (error) {
    console.error("Could not record the welcome email as sent:", describeError(error));
  }
}

export function createJoinWaitlistHandler(dependencies: JoinWaitlistDependencies) {
  const { store, defer } = dependencies;

  return async function handleJoinWaitlist(request: Request): Promise<Response> {
    if (!isJson(request)) {
      return errorResponse(400, "validation_failed", "Send the request as application/json");
    }

    const body = await readJson(request);
    if (body === undefined) {
      return errorResponse(400, "validation_failed", "The request body is not valid JSON");
    }

    // A bot filled the hidden field: answer as if it worked whatever else it
    // sent, and store nothing, so it gets no signal that it was caught.
    if (filledHoneypot(body)) {
      return Response.json({ ok: true });
    }

    const parsed = JoinWaitlistRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid request",
      );
    }

    let created: boolean;
    try {
      ({ created } = await store.join({
        email: parsed.data.email,
        source: parsed.data.source ?? null,
      }));
    } catch (error) {
      console.error("Could not add a Waitlist Entry:", describeError(error));
      return errorResponse(500, "internal", SERVER_ERROR_MESSAGE);
    }

    // Only a new entry is emailed, so the form can't be used to fill someone
    // else's inbox. The response is the same either way.
    if (created) {
      const { email } = parsed.data;
      defer(() => sendWelcomeEmail(dependencies, email));
    }

    return Response.json({ ok: true });
  };
}
