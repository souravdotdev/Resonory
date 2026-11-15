import "reflect-metadata";
import { UnrecoverableError } from "bullmq";
import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";
import type { TagItemResult } from "@/application/dto/items/TagItemResult";
import type { TagItemUseCase } from "@/application/use-cases/items/TagItemUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { tagItem } from "@/interface/processors/tagItem.processor";
import { createRecordingLogger } from "../../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function testContainer(execute: () => Promise<TagItemResult>) {
  const logger = createRecordingLogger();
  const useCase = { execute: vi.fn(execute) };
  const container = new Container();
  container
    .bind<Pick<TagItemUseCase, "execute">>(WORKER_TOKENS.TagItemUseCase)
    .toConstantValue(useCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  return { container, logger, useCase };
}

describe("a Tag Item job", () => {
  it("tags the Item named by the job, scoped to its User", async () => {
    const { container, useCase } = testContainer(async () => ({ outcome: "missing" }));

    await tagItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(useCase.execute).toHaveBeenCalledExactlyOnceWith({ itemId: ITEM_ID, userId: USER_ID });
  });

  it("logs how many Tags the model gave and how many went on, never the names", async () => {
    const { container, logger } = testContainer(async () => ({
      outcome: "tagged",
      suggested: ["Postgres", "Row locks", "!!!", "sql"],
      applied: ["postgres", "row-locks"],
    }));

    await tagItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: { suggested: 4, applied: 2 },
        msg: "Item is AI-tagged",
      },
    ]);
  });

  it("logs at info that tagging is skipped when no model is configured", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "unconfigured" }));

    await tagItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "AI tagging isn't configured; the Item gets no AI Tags",
      },
    ]);
  });

  it("logs that a missing Item has nothing to tag", async () => {
    const { container, logger } = testContainer(async () => ({ outcome: "missing" }));

    await tagItem(container, { itemId: ITEM_ID, userId: USER_ID });

    expect(logger.logs).toEqual([
      {
        level: "info",
        bindings: { itemId: ITEM_ID },
        fields: {},
        msg: "Item no longer exists; nothing to tag",
      },
    ]);
  });

  it("lets a model error through, so BullMQ retries the job", async () => {
    const { container } = testContainer(async () => {
      throw new Error("429 Rate limit reached");
    });

    await expect(tagItem(container, { itemId: ITEM_ID, userId: USER_ID })).rejects.toThrow(
      "429 Rate limit reached",
    );
  });

  it("fails a payload that names no Item without a retry", async () => {
    const { container, useCase } = testContainer(async () => ({ outcome: "missing" }));

    await expect(tagItem(container, { itemId: "not-a-uuid" })).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(useCase.execute).not.toHaveBeenCalled();
  });
});
