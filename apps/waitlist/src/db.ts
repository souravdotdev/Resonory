import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "./env";

let db: PostgresJsDatabase | undefined;

/**
 * The waitlist app's own connection, created on first use. Sized for
 * serverless functions behind Supabase's transaction pooler: prepared
 * statements off (the pooler doesn't support them) and a pool of one.
 */
export function getDb(): PostgresJsDatabase {
  if (!db) {
    const client = postgres(getEnv().DATABASE_URL, { prepare: false, max: 1 });
    db = drizzle(client);
  }
  return db;
}
