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

  it("throws without logging, rather than process, an invalid payload", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await expect(processItem(container, { itemId: "not-a-uuid" })).rejects.toThrow(
      "Invalid Process Item payload",
    );
    expect(logger.logs).toEqual([]);
  });
});
