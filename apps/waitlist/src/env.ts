import { z } from "zod";

const schema = z.object({
  // Supabase's transaction pooler (port 6543) in production.
  DATABASE_URL: z.url(),
});

export type WaitlistEnv = z.infer<typeof schema>;

let cached: WaitlistEnv | undefined;

/**
 * Validates the environment on first call and caches it. Lazy rather than at
 * import time, so `next build` never needs a database configured.
 */
export function getEnv(): WaitlistEnv {
  if (cached) return cached;

  const parsed = schema.safeParse({ DATABASE_URL: process.env.DATABASE_URL });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables in waitlist:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
