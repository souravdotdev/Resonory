import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "validation_failed",
  "not_found",
  "unauthorized",
  // Authenticated, but not in a way this route accepts (an API key on a web-Session-only route).
  "forbidden",
  // 409s at the Tag limits, each with its own code so a client can tell the User which.
  "item_tag_limit",
  "user_tag_limit",
  "rate_limited",
  "internal",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** The one envelope every API error is sent in. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
