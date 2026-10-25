import { z } from "zod";

export const INVALID_EMAIL_MESSAGE = "Enter a valid email address";

/** The longest `source` kept; anything past it is cut off, not refused. */
export const SOURCE_MAX_LENGTH = 100;

/** The email rule the form checks before sending and the endpoint enforces. */
export const WaitlistEmailSchema = z
  .string({ error: INVALID_EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: INVALID_EMAIL_MESSAGE }));

export const JoinWaitlistRequestSchema = z.object({
  email: WaitlistEmailSchema,
  // The visitor's utm_source, or else the referring host.
  source: z
    .string()
    .trim()
    .transform((source) => source.slice(0, SOURCE_MAX_LENGTH) || null)
    .optional(),
  // Honeypot: hidden from people, filled in by bots.
  company: z.string().optional(),
});

export type JoinWaitlistRequest = z.infer<typeof JoinWaitlistRequestSchema>;
