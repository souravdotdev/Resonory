import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

// Better Auth's `@better-auth/api-key` plugin's own model (table name "apikey",
// singular, per the plugin's schema). Only the plugin reads and writes it; no
// domain entity maps it — it exists purely so `enableSessionForAPIKeys` can
// resolve a Session from a request's API key header the same way it resolves
// one from a Session cookie (spec #143/#144).
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The plugin's multi-configuration id; unused here (one configuration, the default).
  configId: text("config_id").notNull(),
  name: text("name"),
  // First few characters of the raw key, safe to display; never the raw key itself.
  start: text("start"),
  // The User the key belongs to (`references: "user"`, this plugin's default).
  referenceId: uuid("reference_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prefix: text("prefix"),
  // The raw key is hashed before storage; only the hash is ever persisted.
  key: text("key").notNull().unique(),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
  rateLimitTimeWindow: integer("rate_limit_time_window"),
  rateLimitMax: integer("rate_limit_max"),
  requestCount: integer("request_count").notNull().default(0),
  remaining: integer("remaining"),
  lastRequest: timestamp("last_request", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  permissions: text("permissions"),
  metadata: text("metadata"),
});
