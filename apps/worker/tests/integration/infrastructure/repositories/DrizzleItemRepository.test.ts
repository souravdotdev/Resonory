import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items, users } from "@resonory/db/schema";
import { TAGGING_TEXT_LENGTH } from "@/domain/rules/aiTagNames";
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
});
