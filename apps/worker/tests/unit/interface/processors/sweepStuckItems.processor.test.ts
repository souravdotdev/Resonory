import "reflect-metadata";
import { UnrecoverableError } from "bullmq";
import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";
import type { SweepStuckItemsResult } from "@/application/dto/items/SweepStuckItemsResult";
import type { SweepStuckItemsUseCase } from "@/application/use-cases/items/SweepStuckItemsUseCase";
import { WORKER_TOKENS } from "@/di/tokens";
import { sweepStuckItems } from "@/interface/processors/sweepStuckItems.processor";
import { createRecordingLogger } from "../../testLogger";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";

function testContainer(
  execute: (input: { stuckAfterMs: number }) => Promise<SweepStuckItemsResult>,
) {
  const logger = createRecordingLogger();
  const useCase = { execute: vi.fn(execute) };
  const container = new Container();
  container
    .bind<Pick<SweepStuckItemsUseCase, "execute">>(WORKER_TOKENS.SweepStuckItemsUseCase)
    .toConstantValue(useCase);
  container.bind(WORKER_TOKENS.Logger).toConstantValue(logger);
  return { container, logger, useCase };
}

describe("a sweep job", () => {
  it("sweeps for Items stuck as long as the job says, and logs how many it ended", async () => {
    const { container, logger, useCase } = testContainer(async () => ({ ended: 3, errors: [] }));

    await sweepStuckItems(container, { stuckAfterMs: 600_000 });

    expect(useCase.execute).toHaveBeenCalledWith({ stuckAfterMs: 600_000 });
    expect(logger.logs).toEqual([
      { level: "info", bindings: {}, fields: { ended: 3 }, msg: "swept the stuck Items" },
    ]);
  });

  it("warns about each Item it couldn't end, with the error's name and never its message", async () => {
    const { container, logger } = testContainer(async () => ({
      ended: 1,
      errors: [{ itemId: ITEM_ID, error: new TypeError("secret detail") }],
    }));

    await sweepStuckItems(container, { stuckAfterMs: 600_000 });

    expect(logger.logs[0]).toMatchObject({
      level: "warn",
      fields: { itemId: ITEM_ID },
      msg: "couldn't end a stuck Item",
    });
    expect(JSON.stringify(logger.logs)).not.toContain("secret detail");
    expect(logger.logs[1]).toMatchObject({ level: "info", fields: { ended: 1 } });
  });

  it.each([{}, { stuckAfterMs: 0 }, { stuckAfterMs: "600000" }, null, undefined])(
    "fails without a retry for data that doesn't say how long an Item may be Processing: %j",
    async (data) => {
      const { container, useCase } = testContainer(async () => ({ ended: 0, errors: [] }));

      await expect(sweepStuckItems(container, data)).rejects.toThrow(UnrecoverableError);
      expect(useCase.execute).not.toHaveBeenCalled();
    },
  );

  it("lets an error finding the Items propagate, so the job fails and the next interval tries again", async () => {
    const { container } = testContainer(async () => {
      throw new Error("Postgres is down");
    });

    await expect(sweepStuckItems(container, { stuckAfterMs: 600_000 })).rejects.toThrow(
      "Postgres is down",
    );
  });
});
