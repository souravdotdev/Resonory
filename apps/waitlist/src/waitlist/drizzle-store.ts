import { count } from "drizzle-orm";
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
      await getDb()
        .insert(waitlistEntries)
        .values({ email: entry.email, source: entry.source })
        .onConflictDoNothing({ target: waitlistEntries.email });
    },
    async count() {
      const [row] = await getDb().select({ value: count() }).from(waitlistEntries);
      return row?.value ?? 0;
    },
  };
}
