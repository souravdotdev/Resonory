import "reflect-metadata";
import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";
import { WORKER_TOKENS } from "@/di/tokens";
import { tagItemFailed } from "@/interface/processors/tagItemFailed.processor";
import { createRecordingLogger } from "../../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

// Every use case that could change an Item, so a test can show none is run.
function testContainer() {
  const logger = createRecordingLogger();
  const failItem = { execute: vi.fn(async () => ({ outcome: "missing" as const })) };
  const container = new Container();
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  container.bind(WORKER_TOKENS.FailItemUseCase).toConstantValue(failItem);
  return { container, logger, failItem };
}

describe("a Tag Item job's last failed attempt", () => {
  it("logs that the Item stays Ready without AI Tags, carrying that Item's id", async () => {
    const { container, logger } = testContainer();

    await tagItemFailed(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "warn",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "AI tagging gave up; the Item stays Ready without AI Tags",
      },
    ]);
  });

  it("never marks the Item Failed", async () => {
    const { container, failItem } = testContainer();

    await tagItemFailed(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(failItem.execute).not.toHaveBeenCalled();
  });

  it("logs nothing for a payload that names no Item", async () => {
    const { container, logger } = testContainer();

    await tagItemFailed(container, { itemId: "not-a-uuid" });

    expect(logger.logs).toEqual([]);
  });
});
