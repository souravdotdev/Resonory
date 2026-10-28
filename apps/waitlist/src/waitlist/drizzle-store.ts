import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { waitlistEntries } from "@resonory/db/schema";
import type { WaitlistStore } from "./store";

/**
 * The Waitlist store over Postgres. Takes a getter so the connection is only
 * opened on the first request, never at build time.
 */
export function createDrizzleWaitlistStore(getDb: () => PostgresJsDatabase): WaitlistStore {
  return {
    async join(entry) {
      const inserted = await getDb()
        .insert(waitlistEntries)
        .values({ email: entry.email, source: entry.source })
        .onConflictDoNothing({ target: waitlistEntries.email })
        .returning({ id: waitlistEntries.id });
      return { created: inserted.length > 0 };
    },
    async markWelcomeEmailed(email) {
      await getDb()
        .update(waitlistEntries)
        .set({ welcomeEmailedAt: sql`now()` })
        .where(and(eq(waitlistEntries.email, email), isNull(waitlistEntries.welcomeEmailedAt)));
    },
    async count() {
      const [row] = await getDb().select({ value: count() }).from(waitlistEntries);
      return row?.value ?? 0;
    },
  };
}
