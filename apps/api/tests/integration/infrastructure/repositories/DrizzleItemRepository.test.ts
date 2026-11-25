import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { itemTags, items, rejectedItemTags, tags, users } from "@resonory/db/schema";
import type { Item } from "@/domain/entities/Item";
import type { Database } from "@/infrastructure/database/Database";
import { DrizzleItemRepository } from "@/infrastructure/repositories/DrizzleItemRepository";
import { createTestDatabase, type TestDatabase } from "../../support/testDatabase";

let testDatabase: TestDatabase;
let db: Database;
let repository: DrizzleItemRepository;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  db = testDatabase.db;
  repository = new DrizzleItemRepository(db);
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

async function anItem(
  userId: string,
  {
    id,
    createdAt,
    status,
    extractedText,
  }: {
    id?: string;
    createdAt?: Date;
    status?: "processing" | "failed";
    extractedText?: string;
  } = {},
): Promise<string> {
  const [item] = await db
    .insert(items)
    // A finished (here Failed) Item always has an Item type (items_type_set_when_finished).
    .values({
      id,
      userId,
      sourceUrl: "https://example.com/post",
      createdAt,
      status,
      type: status === "failed" ? "article" : undefined,
      extractedText,
    })
    .returning({ id: items.id });
  return item!.id;
}

describe("DrizzleItemRepository.listForUser", () => {
  it("lists nothing for a User with no Items", async () => {
    const userId = await aUser();

    expect(await repository.listForUser(userId)).toEqual([]);
  });

  it("lists the User's Items newest first", async () => {
    const userId = await aUser();
    const oldest = await anItem(userId, { createdAt: new Date("2026-05-01T00:00:00.000Z") });
    const newest = await anItem(userId, { createdAt: new Date("2026-05-03T00:00:00.000Z") });
    const middle = await anItem(userId, { createdAt: new Date("2026-05-02T00:00:00.000Z") });

    const listed = await repository.listForUser(userId);

    expect(listed.map((item) => item.id)).toEqual([newest, middle, oldest]);
  });

  it("orders two Items created at the same moment by id descending", async () => {
    const userId = await aUser();
    const sameMoment = new Date("2026-05-02T00:00:00.000Z");
    const lower = "00000000-0000-4000-8000-00000000000a";
    const higher = "00000000-0000-4000-8000-00000000000b";
    await anItem(userId, { id: lower, createdAt: sameMoment });
    await anItem(userId, { id: higher, createdAt: sameMoment });

    const listed = await repository.listForUser(userId);

    expect(listed.map((item) => item.id)).toEqual([higher, lower]);
  });

  it("never loads an Item's Text, which no card shows", async () => {
    const userId = await aUser();
    const itemId = await anItem(userId, { extractedText: "A long article body…" });

    const [listed] = await repository.listForUser(userId);

    expect(listed).not.toHaveProperty("extractedText");
    const { extractedText: _text, ...summary } = (await repository.findById(userId, itemId))!;
    expect(listed).toEqual(summary);
  });

  it("includes Processing and Failed Items, as whole Item summaries", async () => {
    const userId = await aUser();
    const processing = await anItem(userId, {
      status: "processing",
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
    });
    const failed = await anItem(userId, {
      status: "failed",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    const listed = await repository.listForUser(userId);

    const withoutText = (item: Item | null) => {
      const { extractedText: _text, ...summary } = item!;
      return summary;
    };
    expect(listed).toEqual([
      withoutText(await repository.findById(userId, processing)),
      withoutText(await repository.findById(userId, failed)),
    ]);
    expect(listed.map((item) => item.status)).toEqual(["processing", "failed"]);
  });

  it("never lists another User's Items", async () => {
    const userId = await aUser();
    const otherUserId = await aUser();
    const own = await anItem(userId);
    await anItem(otherUserId);

    const listed = await repository.listForUser(userId);

    expect(listed.map((item) => item.id)).toEqual([own]);
  });
});

describe("DrizzleItemRepository.delete", () => {
  it("deletes the User's Item with its Tag links and Rejected tags, keeping their Tags", async () => {
    const userId = await aUser();
    const itemId = await anItem(userId, { extractedText: "The Item's Text" });
    const [tag] = await db.insert(tags).values({ userId, name: "memory" }).returning();
    await db.insert(itemTags).values({ itemId, tagId: tag!.id, userId, source: "user" });
    await db.insert(rejectedItemTags).values({ itemId, userId, tagName: "sleep" });

    const deleted = await repository.delete(userId, itemId);

    expect(deleted).toBe(true);
    expect(await repository.findById(userId, itemId)).toBeNull();
    expect(await db.select().from(itemTags).where(eq(itemTags.itemId, itemId))).toEqual([]);
    expect(
      await db.select().from(rejectedItemTags).where(eq(rejectedItemTags.itemId, itemId)),
    ).toEqual([]);
    expect(await db.select().from(tags).where(eq(tags.userId, userId))).toEqual([tag]);
  });

  it("leaves the User's other Items", async () => {
    const userId = await aUser();
    const deletedId = await anItem(userId);
    const keptId = await anItem(userId);

    await repository.delete(userId, deletedId);

    expect((await repository.listForUser(userId)).map((item) => item.id)).toEqual([keptId]);
  });

  it("reports false for an Item that doesn't exist, or was already deleted", async () => {
    const userId = await aUser();
    const itemId = await anItem(userId);
    await repository.delete(userId, itemId);

    expect(await repository.delete(userId, itemId)).toBe(false);
    expect(await repository.delete(userId, randomUUID())).toBe(false);
  });

  it("reports false for another User's Item, and leaves it", async () => {
    const userId = await aUser();
    const otherUserId = await aUser();
    const theirs = await anItem(otherUserId);

    expect(await repository.delete(userId, theirs)).toBe(false);
    expect(await repository.findById(otherUserId, theirs)).not.toBeNull();
  });
});
