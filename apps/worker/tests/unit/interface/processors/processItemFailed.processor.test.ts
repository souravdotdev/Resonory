import "reflect-metadata";
import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";
import type { FailItemResult } from "@/application/dto/items/FailItemResult";
import type { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { processItemFailed } from "@/interface/processors/processItemFailed.processor";
import { createRecordingLogger } from "../../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function testContainer(execute: () => Promise<FailItemResult>) {
  const logger = createRecordingLogger();
  const container = new Container();
  container
    .bind<Pick<FailItemUseCase, "execute">>(WORKER_TOKENS.FailItemUseCase)
    .toConstantValue({ execute: vi.fn(execute) });
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  return { container, logger };
}

describe("a Process Item job's last failed attempt", () => {
  it("logs that an Item is Failed, carrying that Item's id", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "failed",
      type: "link",
    }));

    await processItemFailed(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { type: "link" },
        msg: "Item is Failed",
      },
    ]);
  });

  it("logs that a missing Item has nothing to mark Failed, carrying that Item's id", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await processItemFailed(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "Item no longer exists; nothing to mark Failed",
      },
    ]);
  });

  it("logs nothing for a payload that names no Item", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await processItemFailed(container, { itemId: "not-a-uuid" });

    expect(logger.logs).toEqual([]);
  });
});
