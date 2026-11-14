import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@resonory/db/schema";
import type { Database } from "@/infrastructure/database/Database";

// The Compose Postgres from docker-compose.yml. Its `postgres` database is only
// connected to, to create and drop the throwaway ones; `resonory` is never touched.
const DEFAULT_SERVER_URL = "postgres://postgres:postgres@localhost:5433/postgres";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../../../packages/db/migrations", import.meta.url),
);

// Enough connections that every concurrent call in a test gets its own, so they
// really race instead of queueing for the pool.
const MAX_CONNECTIONS = 25;

/** A throwaway database with every migration applied, and the way to drop it. */
export interface TestDatabase {
  db: Database;
  drop(): Promise<void>;
}

// postgres.js and Drizzle both log NOTICEs (e.g. "schema drizzle already exists"); tests don't need them.
const quiet = { onnotice: () => {} };

/**
 * Creates a database with a unique name on the server `TEST_DATABASE_URL` points at
 * (the Compose Postgres by default), runs every migration in `packages/db/migrations`
 * and returns a Drizzle handle over the real schema. Call `drop()` in `afterAll`:
 * it closes the connections and drops the database even if a test left one open.
 * A failure while creating or migrating drops it before rethrowing.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const serverUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_SERVER_URL;
  const name = `resonory_test_${randomBytes(6).toString("hex")}`;
  const admin = postgres(serverUrl, { max: 1, ...quiet });

  const dropDatabase = async () => {
    try {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  };

  try {
    await admin.unsafe(`CREATE DATABASE "${name}"`);
  } catch (error) {
    await admin.end();
    throw error;
  }

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: MAX_CONNECTIONS, ...quiet });
  const db: Database = drizzle(client, { schema });

  const drop = async () => {
    try {
      await client.end();
    } finally {
      await dropDatabase();
    }
  };

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    await drop();
    throw error;
  }

  return { db, drop };
}

/**
 * The Postgres error a query failed with: Drizzle wraps it in a `DrizzleQueryError`
 * whose `cause` is postgres.js's error, carrying the SQLSTATE `code` and the
 * `constraint_name`. Fails the test if the query succeeded.
 */
export async function postgresErrorOf(
  query: Promise<unknown>,
): Promise<{ code: string; constraint_name?: string }> {
  try {
    await query;
  } catch (error) {
    const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
    if (cause instanceof postgres.PostgresError) return cause;
    throw error;
  }
  throw new Error("Expected the query to fail, but it succeeded");
}
