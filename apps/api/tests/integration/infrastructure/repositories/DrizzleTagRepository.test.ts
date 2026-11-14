import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items, itemTags, tags, users } from "@resonory/db/schema";
import { ItemTagLimitError, NotFoundError, UserTagLimitError } from "@/domain/errors";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import type { Database } from "@/infrastructure/database/Database";
import { DrizzleTagRepository } from "@/infrastructure/repositories/DrizzleTagRepository";
import { createTestDatabase, postgresErrorOf, type TestDatabase } from "../../support/testDatabase";

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
    .values({ userId, sourceUrl: "https://example.com/post" })
    .returning({ id: items.id });
  return item!.id;
}

async function aTag(userId: string, name: string, createdAt?: Date): Promise<string> {
  const [tag] = await db
    .insert(tags)
    .values({ userId, name, createdAt })
    .returning({ id: tags.id });
  return tag!.id;
}

// A link written straight to item_tags, as the AI tagger will: no limit, any source and time.
async function aLink(
  userId: string,
  itemId: string,
  tagId: string,
  { source = "ai", createdAt }: { source?: "ai" | "user"; createdAt?: Date } = {},
): Promise<void> {
  await db.insert(itemTags).values({ userId, itemId, tagId, source, createdAt });
}

async function linksOn(itemId: string) {
  return db.select().from(itemTags).where(eq(itemTags.itemId, itemId));
}

async function tagCount(userId: string): Promise<number> {
  const [{ owned } = { owned: 0 }] = await db
    .select({ owned: count() })
    .from(tags)
    .where(eq(tags.userId, userId));
  return owned;
}

// The calls' settled results, split into what they returned and what they threw.
async function settle<T>(calls: Promise<T>[]) {
  const results = await Promise.allSettled(calls);
  return {
    fulfilled: results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
    rejected: results.flatMap((result) => (result.status === "rejected" ? [result.reason] : [])),
  };
}

describe("DrizzleTagRepository against Postgres", () => {
  describe("findOrCreate", () => {
    it("ends 8 concurrent calls for one new name with exactly one Tag, every call returning it", async () => {
      const userId = await aUser();

      const found = await Promise.all(
        Array.from({ length: 8 }, () => repository.findOrCreate(userId, "memory")),
      );

      const rows = await db.select().from(tags).where(eq(tags.userId, userId));
      expect(rows).toHaveLength(1);
      expect(new Set(found.map((tag) => tag.id))).toEqual(new Set([rows[0]!.id]));
    });

    it("lets exactly 10 of 20 concurrent creates through for a User's last 10 Tag slots", async () => {
      const userId = await aUser();
      await db.insert(tags).values(
        Array.from({ length: MAX_TAGS_PER_USER - 10 }, (_, index) => ({
          userId,
          name: `seeded-${index}`,
        })),
      );

      const { fulfilled, rejected } = await settle(
        Array.from({ length: 20 }, (_, index) => repository.findOrCreate(userId, `new-${index}`)),
      );

      expect(fulfilled).toHaveLength(10);
      expect(rejected).toHaveLength(10);
      expect(rejected.every((error) => error instanceof UserTagLimitError)).toBe(true);
      expect(await tagCount(userId)).toBe(MAX_TAGS_PER_USER);
    });
  });

  describe("applyAsUser", () => {
    it("makes the AI's link the User's, keeping when it was made", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagId = await aTag(userId, "memory");
      const linkedAt = new Date("2026-01-01T00:00:00.000Z");
      await aLink(userId, itemId, tagId, { source: "ai", createdAt: linkedAt });

      await repository.applyAsUser({ userId, itemId, tagId });

      expect(await linksOn(itemId)).toEqual([
        expect.objectContaining({ tagId, source: "user", createdAt: linkedAt }),
      ]);
    });

    it("leaves the User's own link as it is", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagId = await aTag(userId, "memory");
      const linkedAt = new Date("2026-01-01T00:00:00.000Z");
      await aLink(userId, itemId, tagId, { source: "user", createdAt: linkedAt });

      await repository.applyAsUser({ userId, itemId, tagId });

      expect(await linksOn(itemId)).toEqual([
        expect.objectContaining({ tagId, source: "user", createdAt: linkedAt }),
      ]);
    });

    // The use case checks the Tag is the User's first; this is the foreign key behind that check.
    it("refuses another User's Tag through the composite foreign key, linking nothing", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const othersTagId = await aTag(await aUser(), "memory");

      const error = await postgresErrorOf(
        repository.applyAsUser({ userId, itemId, tagId: othersTagId }),
      );

      expect(error.constraint_name).toBe("item_tags_tag_id_user_id_tags_fk");
      expect(await linksOn(itemId)).toEqual([]);
    });

    it("refuses another User's Item with a NotFoundError, linking nothing", async () => {
      const otherUserId = await aUser();
      const othersItemId = await anItem(otherUserId);
      const userId = await aUser();
      const tagId = await aTag(userId, "memory");

      await expect(repository.applyAsUser({ userId, itemId: othersItemId, tagId })).rejects.toThrow(
        NotFoundError,
      );
      expect(await linksOn(othersItemId)).toEqual([]);
    });

    it("throws a NotFoundError for an Item deleted since it was found, linking nothing", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagId = await aTag(userId, "memory");
      await db.delete(items).where(eq(items.id, itemId));

      await expect(repository.applyAsUser({ userId, itemId, tagId })).rejects.toThrow(
        NotFoundError,
      );
      expect(await db.select().from(itemTags).where(eq(itemTags.tagId, tagId))).toEqual([]);
    });

    it("lets exactly 1 of 10 concurrent links through for an Item's last free slot", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      for (let index = 0; index < MAX_TAGS_PER_ITEM - 1; index++) {
        await aLink(userId, itemId, await aTag(userId, `seeded-${index}`));
      }
      const newTagIds = await Promise.all(
        Array.from({ length: 10 }, (_, index) => aTag(userId, `new-${index}`)),
      );

      const { fulfilled, rejected } = await settle(
        newTagIds.map((tagId) => repository.applyAsUser({ userId, itemId, tagId })),
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(9);
      expect(rejected.every((error) => error instanceof ItemTagLimitError)).toBe(true);
      expect(await linksOn(itemId)).toHaveLength(MAX_TAGS_PER_ITEM);
    });

    it("still re-applies a Tag that's already on a full Item", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagIds: string[] = [];
      for (let index = 0; index < MAX_TAGS_PER_ITEM; index++) {
        const tagId = await aTag(userId, `seeded-${index}`);
        await aLink(userId, itemId, tagId, { source: "ai" });
        tagIds.push(tagId);
      }

      await repository.applyAsUser({ userId, itemId, tagId: tagIds[0]! });

      const links = await linksOn(itemId);
      expect(links).toHaveLength(MAX_TAGS_PER_ITEM);
      expect(links.find((link) => link.tagId === tagIds[0])?.source).toBe("user");
    });
  });

  describe("the composite foreign keys", () => {
    // Below the repository, which scopes the Item to the caller before it would get this far.
    it("refuse a link between one User's Item and another User's Tag", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const othersTagId = await aTag(await aUser(), "memory");

      const error = await postgresErrorOf(
        db.insert(itemTags).values({ userId, itemId, tagId: othersTagId, source: "user" }),
      );

      expect(error).toMatchObject({
        code: "23503",
        constraint_name: "item_tags_tag_id_user_id_tags_fk",
      });
      expect(await linksOn(itemId)).toEqual([]);
    });

    it("refuse a link between one User's Tag and another User's Item", async () => {
      const userId = await aUser();
      const tagId = await aTag(userId, "memory");
      const othersItemId = await anItem(await aUser());

      const error = await postgresErrorOf(
        db.insert(itemTags).values({ userId, itemId: othersItemId, tagId, source: "user" }),
      );

      expect(error).toMatchObject({
        code: "23503",
        constraint_name: "item_tags_item_id_user_id_items_fk",
      });
      expect(await linksOn(othersItemId)).toEqual([]);
    });
  });

  describe("removeFromItem", () => {
    it("removes nothing when scoped to another User", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const tagId = await aTag(userId, "memory");
      await aLink(userId, itemId, tagId);

      await repository.removeFromItem({ userId: await aUser(), itemId, tagId });

      expect(await linksOn(itemId)).toHaveLength(1);
    });

    it("removes only that link when scoped to the owner, keeping the Tag", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const otherItemId = await anItem(userId);
      const tagId = await aTag(userId, "memory");
      const keptTagId = await aTag(userId, "notes");
      await aLink(userId, itemId, tagId);
      await aLink(userId, itemId, keptTagId);
      await aLink(userId, otherItemId, tagId);

      await repository.removeFromItem({ userId, itemId, tagId });

      expect((await linksOn(itemId)).map((link) => link.tagId)).toEqual([keptTagId]);
      expect((await linksOn(otherItemId)).map((link) => link.tagId)).toEqual([tagId]);
      expect(await repository.findById(userId, tagId)).not.toBeNull();
    });
  });

  describe("listForUser", () => {
    it("orders the User's Tags by their latest link, falling back to when they were created, ties by name", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);
      const otherItemId = await anItem(userId);
      const at = (day: number) => new Date(`2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`);
      // Created first, but put on an Item last (by the User), so it leads.
      const latest = await aTag(userId, "latest", at(1));
      // Its latest link is the AI's, and an AI link counts as a use.
      const byAi = await aTag(userId, "by-ai", at(1));
      // On no Items: it sorts by when it was created.
      const unused = await aTag(userId, "unused", at(6));
      // Same latest link time: alphabetical.
      const tiedB = await aTag(userId, "tied-b", at(1));
      const tiedA = await aTag(userId, "tied-a", at(1));
      await aLink(userId, itemId, latest, { source: "user", createdAt: at(2) });
      await aLink(userId, otherItemId, latest, { source: "user", createdAt: at(9) });
      await aLink(userId, itemId, byAi, { source: "ai", createdAt: at(8) });
      await aLink(userId, itemId, tiedB, { source: "user", createdAt: at(4) });
      await aLink(userId, itemId, tiedA, { source: "user", createdAt: at(4) });
      // Another User's Tag, used most recently of all, never shows up.
      const otherUserId = await aUser();
      await aLink(
        otherUserId,
        await anItem(otherUserId),
        await aTag(otherUserId, "someone-elses", at(1)),
        { createdAt: at(20) },
      );

      const listed = await repository.listForUser(userId);

      expect(listed.map((tag) => tag.name)).toEqual([
        "latest",
        "by-ai",
        "unused",
        "tied-a",
        "tied-b",
      ]);
      expect(listed.map((tag) => tag.id)).toEqual([latest, byAi, unused, tiedA, tiedB]);
    });

    it("is empty for a User with no Tags", async () => {
      expect(await repository.listForUser(await aUser())).toEqual([]);
    });
  });

  describe("findById", () => {
    it("finds the User's Tag, and never another User's", async () => {
      const userId = await aUser();
      const tagId = await aTag(userId, "memory");

      expect(await repository.findById(userId, tagId)).toMatchObject({ id: tagId, name: "memory" });
      expect(await repository.findById(await aUser(), tagId)).toBeNull();
    });
  });
});
