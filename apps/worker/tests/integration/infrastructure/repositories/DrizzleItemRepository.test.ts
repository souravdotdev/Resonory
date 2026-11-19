import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items, users } from "@resonory/db/schema";
import { TAGGING_TEXT_LENGTH } from "@/domain/entities/Item";
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

async function aUser(): Promise<string> {
  const id = randomUUID();
  await db.insert(users).values({ id, name: "A User", email: `${id}@example.com` });
  return id;
}

async function anItem(userId: string, fields: Partial<typeof items.$inferInsert> = {}) {
  const [item] = await db
    .insert(items)
    .values({
      userId,
      sourceUrl: "https://example.com/post",
      status: "ready",
      type: "link",
      ...fields,
    })
    .returning({ id: items.id });
  return item!.id;
}

describe("the worker's DrizzleItemRepository against Postgres", () => {
  describe("findTaggable", () => {
    it("reads the Item's title, description, Source URL, Item type and Text", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId, {
        type: "article",
        title: "How Postgres row locks work",
        description: "A tour of FOR UPDATE.",
        extractedText: "Row-level locks come in four strengths.",
      });

      expect(await repository.findTaggable({ itemId, userId })).toEqual({
        title: "How Postgres row locks work",
        description: "A tour of FOR UPDATE.",
        sourceUrl: "https://example.com/post",
        type: "article",
        text: "Row-level locks come in four strengths.",
      });
    });

    it("reads only the start of a long Text", async () => {
      const userId = await aUser();
      const start = "é".repeat(TAGGING_TEXT_LENGTH);
      const itemId = await anItem(userId, { extractedText: `${start}and the rest` });

      expect((await repository.findTaggable({ itemId, userId }))?.text).toBe(start);
    });

    it("reads an Item without Text, title or description as nulls", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId, { type: "image" });

      expect(await repository.findTaggable({ itemId, userId })).toMatchObject({
        title: null,
        description: null,
        text: null,
      });
    });

    it("finds nothing for another User's Item, or one that doesn't exist", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId);

      expect(await repository.findTaggable({ itemId, userId: await aUser() })).toBeNull();
      expect(await repository.findTaggable({ itemId: randomUUID(), userId })).toBeNull();
    });
  });
  describe("findProcessingBefore", () => {
    const MINUTE = 60_000;
    const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE);

    it("finds every User's Items still Processing that were saved before the cutoff, oldest first", async () => {
      const [first, second] = [await aUser(), await aUser()];
      const newest = await anItem(first, {
        status: "processing",
        type: null,
        createdAt: minutesAgo(21),
      });
      const oldest = await anItem(second, {
        status: "processing",
        type: null,
        createdAt: minutesAgo(40),
      });
      // Not stuck: too recent, or already finished.
      await anItem(first, { status: "processing", type: null, createdAt: minutesAgo(2) });
      await anItem(first, { status: "ready", type: "article", createdAt: minutesAgo(30) });
      await anItem(first, { status: "failed", type: "link", createdAt: minutesAgo(30) });

      const found = (await repository.findProcessingBefore(minutesAgo(20), 500)).filter(
        (item) => item.userId === first || item.userId === second,
      );

      expect(found.map((item) => item.id)).toEqual([oldest, newest]);
      expect(found[0]).toEqual({
        id: oldest,
        userId: second,
        sourceUrl: "https://example.com/post",
        type: null,
        status: "processing",
      });
    });

    it("finds at most `limit` Items, the oldest first, so the rest wait for the next sweep", async () => {
      // Older than anything another test saves, so these are the oldest in the table.
      const userId = await aUser();
      const [oldest, older, old] = [
        await anItem(userId, { status: "processing", type: null, createdAt: minutesAgo(9000) }),
        await anItem(userId, { status: "processing", type: null, createdAt: minutesAgo(8000) }),
        await anItem(userId, { status: "processing", type: null, createdAt: minutesAgo(7000) }),
      ];

      const found = await repository.findProcessingBefore(minutesAgo(6000), 2);

      expect(found.map((item) => item.id)).toEqual([oldest, older]);
      expect(found.map((item) => item.id)).not.toContain(old);
    });
  });

  describe("markFailedIfProcessing", () => {
    it("marks a Processing Item Failed with the given Item type", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId, { status: "processing", type: null });

      const changed = await repository.markFailedIfProcessing({ itemId, userId }, "link");

      expect(changed).toBe(true);
      const [row] = await db.select().from(items).where(eq(items.id, itemId));
      expect(row).toMatchObject({ status: "failed", type: "link" });
    });

    it("keeps an Item type the Item already has", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId, { status: "processing", type: "video" });

      await repository.markFailedIfProcessing({ itemId, userId }, "video");

      const [row] = await db.select().from(items).where(eq(items.id, itemId));
      expect(row).toMatchObject({ status: "failed", type: "video" });
    });

    it.each(["ready", "failed"] as const)(
      "leaves a %s Item untouched and says so",
      async (status) => {
        const userId = await aUser();
        const itemId = await anItem(userId, {
          status,
          type: "article",
          title: "Already finished",
        });

        const changed = await repository.markFailedIfProcessing({ itemId, userId }, "link");

        expect(changed).toBe(false);
        const [row] = await db.select().from(items).where(eq(items.id, itemId));
        expect(row).toMatchObject({ status, type: "article", title: "Already finished" });
      },
    );

    it("never touches another User's Item, or one that doesn't exist", async () => {
      const userId = await aUser();
      const itemId = await anItem(userId, { status: "processing", type: null });

      expect(
        await repository.markFailedIfProcessing({ itemId, userId: await aUser() }, "link"),
      ).toBe(false);
      expect(
        await repository.markFailedIfProcessing({ itemId: randomUUID(), userId }, "link"),
      ).toBe(false);
      const [row] = await db.select().from(items).where(eq(items.id, itemId));
      expect(row).toMatchObject({ status: "processing", type: null });
    });
  });
});
