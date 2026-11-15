import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, notExists, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items, itemTags, rejectedItemTags, tags, users } from "@resonory/db/schema";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import type { Database } from "@/infrastructure/database/Database";
import { DrizzleTagRepository } from "@/infrastructure/repositories/DrizzleTagRepository";
import { createTestDatabase, type TestDatabase } from "../../support/testDatabase";

let testDatabase: TestDatabase;
let db: Database;
let repository: DrizzleTagRepository;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  db = testDatabase.db;
  repository = new DrizzleTagRepository(db);
});

afterAll(async () => {
  await testDatabase?.drop();
});

// Every test seeds its own Users, so tests sharing the database never see each other's rows.
async function aUser(): Promise<string> {
  const id = randomUUID();
  await db.insert(users).values({ id, name: "A User", email: `${id}@example.com` });
  return id;
}

async function anItem(userId: string): Promise<string> {
  const [item] = await db
    .insert(items)
    .values({ userId, sourceUrl: "https://example.com/post", status: "ready", type: "article" })
    .returning({ id: items.id });
  return item!.id;
}

async function aTag(userId: string, name: string): Promise<string> {
  const [tag] = await db.insert(tags).values({ userId, name }).returning({ id: tags.id });
  return tag!.id;
}

// A Tag only the AI has used.
async function anAiTag(userId: string, name: string): Promise<string> {
  const [tag] = await db
    .insert(tags)
    .values({ userId, name, origin: "ai" })
    .returning({ id: tags.id });
  return tag!.id;
}

// Each of the User's Tags' origin, by Tag name.
async function originsOf(userId: string): Promise<Record<string, "ai" | "user">> {
  const rows = await db
    .select({ name: tags.name, origin: tags.origin })
    .from(tags)
    .where(eq(tags.userId, userId));
  return Object.fromEntries(rows.map((row) => [row.name, row.origin]));
}

// Resolves once another connection to the test database is waiting on a lock.
async function untilWaitingOnALock(): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt++) {
    const waiting = await db.execute(
      sql`select pid from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`,
    );
    if (waiting.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Nothing started waiting on a lock");
}

// A link written straight to item_tags: no limit, any source and time.
async function aLink(
  userId: string,
  itemId: string,
  tagId: string,
  { source = "ai", createdAt }: { source?: "ai" | "user"; createdAt?: Date } = {},
): Promise<void> {
  await db.insert(itemTags).values({ userId, itemId, tagId, source, createdAt });
}

// An Item already carrying `howMany` Tags, linked by the User.
async function anItemWithTags(userId: string, howMany: number): Promise<string> {
  const itemId = await anItem(userId);
  for (let index = 0; index < howMany; index++) {
    await aLink(userId, itemId, await aTag(userId, `${itemId.slice(0, 8)}-${index}`), {
      source: "user",
    });
  }
  return itemId;
}

async function seedTags(userId: string, howMany: number): Promise<void> {
  await db
    .insert(tags)
    .values(Array.from({ length: howMany }, (_, index) => ({ userId, name: `seeded-${index}` })));
}

// The Item's links, by Tag name, oldest first.
async function linksOn(itemId: string) {
  return db
    .select({ name: tags.name, source: itemTags.source, createdAt: itemTags.createdAt })
    .from(itemTags)
    .innerJoin(tags, eq(tags.id, itemTags.tagId))
    .where(eq(itemTags.itemId, itemId))
    .orderBy(asc(itemTags.createdAt), asc(tags.name));
}

async function tagNamesOf(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: tags.name })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
  return rows.map((row) => row.name);
}

async function tagCount(userId: string): Promise<number> {
  const [{ owned } = { owned: 0 }] = await db
    .select({ owned: count() })
    .from(tags)
    .where(eq(tags.userId, userId));
  return owned;
}

async function linkCount(itemId: string): Promise<number> {
  const [{ onItem } = { onItem: 0 }] = await db
    .select({ onItem: count() })
    .from(itemTags)
    .where(eq(itemTags.itemId, itemId));
  return onItem;
}

async function reject(userId: string, itemId: string, tagName: string): Promise<void> {
  await db.insert(rejectedItemTags).values({ userId, itemId, tagName });
}

describe("the worker's DrizzleTagRepository against Postgres", () => {
  describe("listNames", () => {
    it("lists every one of the User's Tag names, and none of another User's", async () => {
      const userId = await aUser();
      const otherUserId = await aUser();
      await aTag(userId, "postgres");
      await aTag(userId, "cooking");
      await aTag(otherUserId, "gardening");

      expect((await repository.listNames(userId)).sort()).toEqual(["cooking", "postgres"]);
    });

    it("leaves out a Tag only the AI used once it's on no Items", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await aLink(userId, itemId, await anAiTag(userId, "on-an-item"));
      // Left on no Items without being taken off: its Item was deleted.
      const deletedItemId = await anItem(userId);
      await aLink(userId, deletedItemId, await anAiTag(userId, "orphaned"));
      await db.delete(items).where(eq(items.id, deletedItemId));
      await aTag(userId, "the-users");

      expect((await repository.listNames(userId)).sort()).toEqual(["on-an-item", "the-users"]);
    });
  });

  describe("listRejectedNames", () => {
    it("lists the names rejected for this Item only, scoped to its User", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const otherItemId = await anItem(userId);
      await reject(userId, itemId, "postgres");
      await reject(userId, otherItemId, "cooking");

      expect(await repository.listRejectedNames({ itemId, userId })).toEqual(["postgres"]);
      expect(await repository.listRejectedNames({ itemId, userId: await aUser() })).toEqual([]);
    });
  });

  describe("applyAsAi", () => {
    it("creates the new Tags and puts them on the Item with Tag source ai", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);

      const applied = await repository.applyAsAi({ itemId, userId }, ["postgres", "row-locks"]);

      expect(applied).toEqual(["postgres", "row-locks"]);
      expect(await tagNamesOf(userId)).toEqual(["postgres", "row-locks"]);
      expect(await linksOn(itemId)).toEqual([
        expect.objectContaining({ name: "postgres", source: "ai" }),
        expect.objectContaining({ name: "row-locks", source: "ai" }),
      ]);
    });

    it("records the Tags it creates as only the AI's", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);

      await repository.applyAsAi({ itemId, userId }, ["postgres"]);

      expect(await originsOf(userId)).toEqual({ postgres: "ai" });
    });

    it("never makes a Tag the User applied only the AI's", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await aTag(userId, "postgres");

      await repository.applyAsAi({ itemId, userId }, ["postgres"]);

      expect(await originsOf(userId)).toEqual({ postgres: "user" });
    });

    it("reuses the User's Tag with that name instead of making another", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagId = await aTag(userId, "postgres");

      await repository.applyAsAi({ itemId, userId }, ["postgres"]);

      expect(await tagCount(userId)).toBe(1);
      const [link] = await db.select().from(itemTags).where(eq(itemTags.itemId, itemId));
      expect(link).toMatchObject({ tagId, source: "ai" });
    });

    it("never reuses another User's Tag of the same name", async () => {
      const userId = await aUser();
      const otherUserId = await aUser();
      const itemId = await anItem(userId);
      await aTag(otherUserId, "postgres");

      await repository.applyAsAi({ itemId, userId }, ["postgres"]);

      expect(await tagNamesOf(userId)).toEqual(["postgres"]);
      expect(await tagCount(otherUserId)).toBe(1);
    });

    it("leaves the User's own link on the Item untouched", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const linkedAt = new Date("2026-01-01T00:00:00.000Z");
      await aLink(userId, itemId, await aTag(userId, "postgres"), {
        source: "user",
        createdAt: linkedAt,
      });

      const applied = await repository.applyAsAi({ itemId, userId }, ["postgres", "locks"]);

      expect(applied).toEqual(["locks"]);
      expect(await linksOn(itemId)).toEqual([
        { name: "postgres", source: "user", createdAt: linkedAt },
        expect.objectContaining({ name: "locks", source: "ai" }),
      ]);
    });

    it("adds nothing new when run twice on one Item", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await repository.applyAsAi({ itemId, userId }, ["postgres", "locks"]);
      const before = await linksOn(itemId);

      const applied = await repository.applyAsAi({ itemId, userId }, ["postgres", "locks"]);

      expect(applied).toEqual([]);
      expect(await linksOn(itemId)).toEqual(before);
      expect(await tagCount(userId)).toBe(2);
    });

    it("never puts on a name rejected for the Item, nor creates its Tag", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await reject(userId, itemId, "postgres");

      const applied = await repository.applyAsAi({ itemId, userId }, ["postgres", "locks"]);

      expect(applied).toEqual(["locks"]);
      expect(await tagNamesOf(userId)).toEqual(["locks"]);
    });

    it("stops at the Item's 20th Tag, creating no Tag it can't put on", async () => {
      const userId = await aUser();
      const itemId = await anItemWithTags(userId, MAX_TAGS_PER_ITEM - 1);
      const owned = await tagCount(userId);

      const applied = await repository.applyAsAi({ itemId, userId }, ["one", "two", "three"]);

      expect(applied).toEqual(["one"]);
      expect(await linkCount(itemId)).toBe(MAX_TAGS_PER_ITEM);
      expect(await tagCount(userId)).toBe(owned + 1);
    });

    it("adds nothing to a full Item, without an error", async () => {
      const userId = await aUser();
      const itemId = await anItemWithTags(userId, MAX_TAGS_PER_ITEM);
      await aTag(userId, "postgres");
      const owned = await tagCount(userId);

      const applied = await repository.applyAsAi({ itemId, userId }, ["postgres", "brand-new"]);

      expect(applied).toEqual([]);
      expect(await linkCount(itemId)).toBe(MAX_TAGS_PER_ITEM);
      expect(await tagCount(userId)).toBe(owned);
    });

    it("only reuses the User's Tags once they have 1,000, without an error", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await seedTags(userId, MAX_TAGS_PER_USER);

      const applied = await repository.applyAsAi({ itemId, userId }, [
        "brand-new",
        "seeded-7",
        "another-new",
      ]);

      expect(applied).toEqual(["seeded-7"]);
      expect(await tagCount(userId)).toBe(MAX_TAGS_PER_USER);
    });

    it("deletes the User's Tags only the AI used that are on no Items, keeping the rest", async () => {
      const userId = await aUser();
      const otherUserId = await aUser();
      const itemId = await anItem(userId);
      await aLink(userId, itemId, await anAiTag(userId, "on-an-item"));
      await aTag(userId, "the-users");
      // Left on no Items without being taken off: their Items were deleted.
      for (const [owner, name] of [
        [userId, "orphaned"],
        [otherUserId, "another-users"],
      ] as const) {
        const deletedItemId = await anItem(owner);
        await aLink(owner, deletedItemId, await anAiTag(owner, name));
        await db.delete(items).where(eq(items.id, deletedItemId));
      }

      await repository.applyAsAi({ itemId: await anItem(userId), userId }, ["postgres"]);

      expect(await tagNamesOf(userId)).toEqual(["on-an-item", "postgres", "the-users"]);
      // Another User's are left for their own next write.
      expect(await tagNamesOf(otherUserId)).toEqual(["another-users"]);
    });

    it("doesn't count a Tag only the AI used that's on no Items towards the 1,000", async () => {
      const userId = await aUser();
      await seedTags(userId, MAX_TAGS_PER_USER - 1);
      const deletedItemId = await anItem(userId);
      await aLink(userId, deletedItemId, await anAiTag(userId, "orphaned"));
      await db.delete(items).where(eq(items.id, deletedItemId));

      const applied = await repository.applyAsAi({ itemId: await anItem(userId), userId }, [
        "brand-new",
      ]);

      expect(applied).toEqual(["brand-new"]);
      expect(await tagCount(userId)).toBe(MAX_TAGS_PER_USER);
    });

    it("puts a Tag only the AI used back on as a new Tag when the model names it again", async () => {
      const userId = await aUser();
      const deletedItemId = await anItem(userId);
      await aLink(userId, deletedItemId, await anAiTag(userId, "orphaned"));
      await db.delete(items).where(eq(items.id, deletedItemId));
      const itemId = await anItem(userId);

      const applied = await repository.applyAsAi({ itemId, userId }, ["orphaned"]);

      expect(applied).toEqual(["orphaned"]);
      expect(await linksOn(itemId)).toMatchObject([{ name: "orphaned", source: "ai" }]);
      expect(await originsOf(userId)).toEqual({ orphaned: "ai" });
    });

    it("skips an Item that no longer exists quietly, creating no Tag", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      await db.delete(items).where(eq(items.id, itemId));

      expect(await repository.applyAsAi({ itemId, userId }, ["postgres"])).toBeNull();
      expect(await tagCount(userId)).toBe(0);
    });

    it("skips another User's Item quietly, creating no Tag for either", async () => {
      const userId = await aUser();
      const otherUserId = await aUser();
      const itemId = await anItem(userId);

      expect(await repository.applyAsAi({ itemId, userId: otherUserId }, ["postgres"])).toBeNull();
      expect(await tagCount(otherUserId)).toBe(0);
      expect(await linkCount(itemId)).toBe(0);
    });

    it("puts nothing on and creates nothing for an empty list", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);

      expect(await repository.applyAsAi({ itemId, userId }, [])).toEqual([]);
      expect(await tagCount(userId)).toBe(0);
    });
  });

  describe("applyAsAi under concurrency", () => {
    it("ends 8 concurrent calls putting one new name on 8 Items with exactly one Tag", async () => {
      const userId = await aUser();
      const itemIds = await Promise.all(Array.from({ length: 8 }, () => anItem(userId)));

      const applied = await Promise.all(
        itemIds.map((itemId) => repository.applyAsAi({ itemId, userId }, ["memory"])),
      );

      expect(applied).toEqual(itemIds.map(() => ["memory"]));
      const rows = await db.select().from(tags).where(eq(tags.userId, userId));
      expect(rows).toHaveLength(1);
      const links = await db.select().from(itemTags).where(eq(itemTags.tagId, rows[0]!.id));
      expect(links).toHaveLength(8);
    });

    it("lets exactly 10 of 20 concurrent creates through for a User's last 10 Tag slots, failing none", async () => {
      const userId = await aUser();
      await seedTags(userId, MAX_TAGS_PER_USER - 10);
      const itemIds = await Promise.all(Array.from({ length: 20 }, () => anItem(userId)));

      const applied = await Promise.all(
        itemIds.map((itemId, index) => repository.applyAsAi({ itemId, userId }, [`new-${index}`])),
      );

      expect(applied.filter((names) => names?.length === 1)).toHaveLength(10);
      expect(applied.filter((names) => names?.length === 0)).toHaveLength(10);
      expect(await tagCount(userId)).toBe(MAX_TAGS_PER_USER);
    });

    it("lets exactly 1 of 10 concurrent calls through for an Item's last free slot, failing none", async () => {
      const userId = await aUser();
      const itemId = await anItemWithTags(userId, MAX_TAGS_PER_ITEM - 1);

      const applied = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          repository.applyAsAi({ itemId, userId }, [`new-${index}`]),
        ),
      );

      expect(applied.flat()).toHaveLength(1);
      expect(await linkCount(itemId)).toBe(MAX_TAGS_PER_ITEM);
      // The losers found the Item full before creating anything.
      expect((await tagNamesOf(userId)).filter((name) => name.startsWith("new-"))).toHaveLength(1);
    });

    it("never pushes an Item past 20 Tags racing the User's own tagging", async () => {
      const userId = await aUser();
      const itemId = await anItemWithTags(userId, MAX_TAGS_PER_ITEM - 5);
      const userTagIds = await Promise.all(
        Array.from({ length: 10 }, (_, index) => aTag(userId, `picked-${index}`)),
      );

      await Promise.all([
        ...Array.from({ length: 10 }, (_, index) =>
          repository.applyAsAi({ itemId, userId }, [`new-${index}`]),
        ),
        ...userTagIds.map((tagId) => applyAsUserLike(userId, itemId, tagId)),
      ]);

      expect(await linkCount(itemId)).toBe(MAX_TAGS_PER_ITEM);
    });

    it("makes the Tag again, on its Item, when an untag is deleting it as the AI puts it on another Item", async () => {
      const userId = await aUser();
      const untaggedItemId = await anItem(userId);
      const itemId = await anItem(userId);
      const tagId = await anAiTag(userId, "memory");
      await aLink(userId, untaggedItemId, tagId);
      let deleted!: () => void;
      const tagDeleted = new Promise<void>((resolve) => (deleted = resolve));
      let finishUntagging!: () => void;
      const untaggingCanFinish = new Promise<void>((resolve) => (finishUntagging = resolve));

      // The untag has deleted the Tag with its last link, and still holds its locks, as the AI writer starts.
      const untagging = removeFromItemLike(userId, untaggedItemId, tagId, async () => {
        deleted();
        await untaggingCanFinish;
      });
      await tagDeleted;
      const tagging = repository.applyAsAi({ itemId, userId }, ["memory"]);
      try {
        await untilWaitingOnALock();
      } finally {
        finishUntagging();
        await untagging;
      }

      expect(await tagging).toEqual(["memory"]);
      expect(await linksOn(itemId)).toEqual([
        expect.objectContaining({ name: "memory", source: "ai" }),
      ]);
      const [remade] = await db.select().from(tags).where(eq(tags.userId, userId));
      expect(remade).toMatchObject({ name: "memory", origin: "ai" });
      expect(remade!.id).not.toBe(tagId);
    });
  });
});

/**
 * A stand-in for the API's `removeFromItem` (apps/api's DrizzleTagRepository),
 * which the worker can't import: in one transaction, the Item's row lock, then
 * the User's, then the link's delete and, with its last link gone, the Tag's if
 * only the AI used it. `whileLocked` runs before it commits.
 */
async function removeFromItemLike(
  userId: string,
  itemId: string,
  tagId: string,
  whileLocked: () => Promise<void>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.select({ id: items.id }).from(items).where(eq(items.id, itemId)).for("no key update");
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("no key update");
    await tx.delete(itemTags).where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
    await tx
      .delete(tags)
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.origin, "ai"),
          notExists(
            tx.select({ tagId: itemTags.tagId }).from(itemTags).where(eq(itemTags.tagId, tagId)),
          ),
        ),
      );
    await whileLocked();
  });
}

/**
 * A stand-in for the API's `applyAsUser` (apps/api's DrizzleTagRepository),
 * which the worker can't import: the same Item-row lock and count, linking
 * only while the Item has room. It locks no User row, so only the Item lock
 * keeps it and the AI writer from overfilling an Item together.
 */
async function applyAsUserLike(userId: string, itemId: string, tagId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.select({ id: items.id }).from(items).where(eq(items.id, itemId)).for("no key update");
    const [{ onItem } = { onItem: 0 }] = await tx
      .select({ onItem: count() })
      .from(itemTags)
      .where(eq(itemTags.itemId, itemId));
    if (onItem >= MAX_TAGS_PER_ITEM) return;
    await tx.insert(itemTags).values({ itemId, tagId, userId, source: "user" });
  });
}
