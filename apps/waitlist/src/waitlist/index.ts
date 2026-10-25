import { getDb } from "@/db";
import { createDrizzleWaitlistStore } from "./drizzle-store";

export { createJoinWaitlistHandler } from "./handler";
export { readProofLine } from "./proof-line";
export type { NewWaitlistEntry, WaitlistStore } from "./store";

/** The app's Waitlist store, backed by its own lazily opened Postgres connection. */
export const waitlistStore = createDrizzleWaitlistStore(getDb);
