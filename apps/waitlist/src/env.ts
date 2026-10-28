import { z } from "zod";

// A variable set to nothing counts as unset.
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const schema = z.object({
  // Supabase's transaction pooler (port 6543) in production.
  DATABASE_URL: z.url(),
  // AutoSend sends the Welcome email. Without a key the app only logs a
  // skipped send, so local development, tests and previews email no one.
  AUTOSEND_API_KEY: optionalString,
  // Sent with each email when set, so AutoSend manages unsubscribing.
  AUTOSEND_UNSUBSCRIBE_GROUP_ID: optionalString,
});

export type WaitlistEnv = z.infer<typeof schema>;

let cached: WaitlistEnv | undefined;

/**
 * Validates the environment on first call and caches it. Lazy rather than at
 * import time, so `next build` never needs a database configured.
 */
export function getEnv(): WaitlistEnv {
  if (cached) return cached;

  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTOSEND_API_KEY: process.env.AUTOSEND_API_KEY,
    AUTOSEND_UNSUBSCRIBE_GROUP_ID: process.env.AUTOSEND_UNSUBSCRIBE_GROUP_ID,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables in waitlist:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
