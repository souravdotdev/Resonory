import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { items } from "./items";

// The Items domain's Tag sources and Tag name rule (slugifyTagName); the API's
// schema-agreement test checks the two agree.
export const tagSourceEnum = pgEnum("tag_source", ["ai", "user"]);

export const tagNameRule = {
  pattern: "^[a-z0-9+#.]+(-[a-z0-9+#.]+)*$",
  maxLength: 50,
} as const;

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The canonical slug; no separate display name is kept.
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One Tag per name within a User's Tags.
    unique("tags_user_id_name_unique").on(table.userId, table.name),
    // Lets item_tags require a Tag and an Item to belong to the same User.
    unique("tags_id_user_id_unique").on(table.id, table.userId),
    // Backstop for slugifyTagName: a skipped normalization step can't store a non-slug.
    check(
      "tags_name_is_slug",
      sql`${table.name} ~ '${sql.raw(tagNameRule.pattern)}' AND char_length(${table.name}) <= ${sql.raw(String(tagNameRule.maxLength))}`,
    ),
  ],
);

// No surrogate id and no updated_at: links are only inserted, deleted, or have their source upgraded.
export const itemTags = pgTable(
  "item_tags",
  {
    itemId: uuid("item_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    // Denormalized so both foreign keys can require the same owner.
    userId: uuid("user_id").notNull(),
    source: tagSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tagId] }),
    // Deleting an Item removes its links but keeps the Tags.
    foreignKey({
      name: "item_tags_item_id_user_id_items_fk",
      columns: [table.itemId, table.userId],
      foreignColumns: [items.id, items.userId],
    }).onDelete("cascade"),
    // Deleting a Tag removes its links.
    foreignKey({
      name: "item_tags_tag_id_user_id_tags_fk",
      columns: [table.tagId, table.userId],
      foreignColumns: [tags.id, tags.userId],
    }).onDelete("cascade"),
    // Serves "every Item with this Tag"; the PK already covers lookups by item_id.
    index("item_tags_tag_id_idx").on(table.tagId),
  ],
);

// Rejected tags: a Tag name the User took off an Item, so AI tagging never puts it
// back. Keyed by name, not Tag id, so a rejection outlives the Tag being deleted.
export const rejectedItemTags = pgTable(
  "rejected_item_tags",
  {
    itemId: uuid("item_id").notNull(),
    // Denormalized so the foreign key can require the Item's owner, like item_tags.
    userId: uuid("user_id").notNull(),
    tagName: text("tag_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tagName] }),
    // Deleting an Item removes its Rejected tags.
    foreignKey({
      name: "rejected_item_tags_item_id_user_id_items_fk",
      columns: [table.itemId, table.userId],
      foreignColumns: [items.id, items.userId],
    }).onDelete("cascade"),
    // The same backstop as tags_name_is_slug: only a Tag name can be rejected.
    check(
      "rejected_item_tags_tag_name_is_slug",
      sql`${table.tagName} ~ '${sql.raw(tagNameRule.pattern)}' AND char_length(${table.tagName}) <= ${sql.raw(String(tagNameRule.maxLength))}`,
    ),
  ],
);
