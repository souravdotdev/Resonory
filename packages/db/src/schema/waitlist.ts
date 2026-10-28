import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// A Waitlist Entry: an email address that asked for early access. It has no
// relation to Users.
export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The waitlist app lowercases the email before insert, so a plain unique
  // constraint is enough.
  email: text("email").notNull().unique(),
  // The visitor's utm_source, or else the referring host.
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Reserved for a later double opt-in; unused for now.
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  // When the email provider accepted the Welcome email; null until then, so
  // an entry that never got one can be found and re-sent later.
  welcomeEmailedAt: timestamp("welcome_emailed_at", { withTimezone: true }),
});
