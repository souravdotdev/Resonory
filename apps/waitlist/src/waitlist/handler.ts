import { JoinWaitlistRequestSchema } from "./request";
import type { WaitlistStore } from "./store";

type ErrorCode = "validation_failed" | "internal";

// Same envelope as @resonory/shared's ErrorResponseSchema.
function errorResponse(status: number, code: ErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status });
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
  if (typeof body !== "object" || body === null || !("company" in body)) return false;
  const { company } = body;
  return typeof company === "string" ? company.trim() !== "" : company != null;
}

export function createJoinWaitlistHandler(store: WaitlistStore) {
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

    try {
      await store.join({ email: parsed.data.email, source: parsed.data.source ?? null });
    } catch (error) {
      console.error("Could not add a Waitlist Entry", error);
      return errorResponse(500, "internal", "We could not add you right now. Please try again.");
    }

    return Response.json({ ok: true });
  };
}
