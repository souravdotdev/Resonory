import "reflect-metadata";
import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";
import type { ProcessItemResult } from "@/application/dto/items/ProcessItemResult";
import type { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { processItem } from "@/interface/processors/processItem.processor";
import { createRecordingLogger } from "../../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function testContainer(execute: () => Promise<ProcessItemResult>) {
  const logger = createRecordingLogger();
  const container = new Container();
  container
    .bind<Pick<ProcessItemUseCase, "execute">>(WORKER_TOKENS.ProcessItemUseCase)
    .toConstantValue({ execute: vi.fn(execute) });
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  return { container, logger };
}

describe("a Process Item job", () => {
  it("logs that an Item is Ready, carrying that Item's id", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "ready",
      type: "link",
      metadata: { title: "A title", description: null },
      thumbnailKey: "key-1",
      text: "The page's words",
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "link", titled: true, pictured: true, texted: true },
        msg: "Item is Ready",
      },
    ]);
  });

  it("logs how long Text extraction took, when it ran", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "ready",
      type: "article",
      metadata: { title: "A title", description: null },
      thumbnailKey: null,
      text: "The page's words",
      textMs: 42,
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "article", titled: true, pictured: false, texted: true, textMs: 42 },
        msg: "Item is Ready",
      },
    ]);
  });

  it("logs an Item Ready without a title, a Thumbnail or Text", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "ready",
      type: "link",
      metadata: { title: null, description: null },
      thumbnailKey: null,
      text: null,
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "link", titled: false, pictured: false, texted: false },
        msg: "Item is Ready",
      },
    ]);
  });

  it("warns, with the error's name and never its message, when Text extraction failed", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "ready",
      type: "article",
      metadata: { title: "A title", description: null },
      thumbnailKey: null,
      text: null,
      textError: new TypeError("Cannot read properties of null (reading 'secret page words')"),
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "warn",
        bindings: { itemId: ITEM_ID },
        fields: { err: "TypeError" },
        msg: "Text extraction failed; the Item is Ready without Text",
      },
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "article", titled: true, pictured: false, texted: false },
        msg: "Item is Ready",
      },
    ]);
  });

  it("warns when the Item's AI tagging couldn't be queued, the Item Ready all the same", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "ready",
      type: "link",
      metadata: { title: null, description: null },
      thumbnailKey: null,
      text: null,
      tagQueueError: new Error("Redis answered ECONNREFUSED"),
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "warn",
        bindings: { itemId: ITEM_ID },
        fields: { event: "tag_item_enqueue_failed", err: "Error" },
        msg: "couldn't queue AI tagging; the Item is Ready without AI Tags",
      },
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "link", titled: false, pictured: false, texted: false },
        msg: "Item is Ready",
      },
    ]);
  });

  it("logs that a missing Item has nothing to process, carrying that Item's id", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "Item no longer exists; nothing to process",
      },
    ]);
  });

  it("warns, under a stable key and with the key, when a deleted Item's Thumbnail couldn't be deleted", async () => {
    const KEY = `${USER_ID}/${ITEM_ID}.webp`;
    const { container, logger } = testContainer(async () => ({
      outcome: "missing",
      orphanedThumbnail: { key: KEY, error: new Error("Storage answered 500") },
    }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "warn",
        bindings: { itemId: ITEM_ID },
        fields: { event: "thumbnail_delete_failed", thumbnailKey: KEY, err: "Error" },
        msg: "couldn't delete the Thumbnail of an Item deleted mid-Processing; it's left an orphan",
      },
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "Item no longer exists; nothing to process",
      },
    ]);
  });

  it("logs, under a stable key, that an already Ready Item has nothing to process", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "already_ready" }));

    await processItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { event: "item_already_ready" },
        msg: "Item is already Ready; nothing to process",
      },
    ]);
  });

  it("throws without logging, rather than process, an invalid payload", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await expect(processItem(container, { itemId: "not-a-uuid" })).rejects.toThrow(
      "Invalid Process Item payload",
    );
    expect(logger.logs).toEqual([]);
  });
});
