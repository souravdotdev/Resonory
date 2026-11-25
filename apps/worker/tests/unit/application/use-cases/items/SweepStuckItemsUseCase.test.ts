import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import {
  MAX_ITEMS_PER_SWEEP,
  SweepStuckItemsUseCase,
} from "@/application/use-cases/items/SweepStuckItemsUseCase";
import type { Item, ItemRef, ItemStatus, ItemType } from "@/domain/entities/Item";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const NOW = new Date("2026-11-19T12:00:00.000Z");
const MINUTE = 60_000;
const STUCK_AFTER_MS = 10 * MINUTE;

const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * MINUTE);

interface Row extends Item {
  savedAt: Date;
}

const rowOf = (
  n: number,
  status: ItemStatus,
  savedAt: Date,
  type: ItemType | null = null,
): Row => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  userId: USER_ID,
  sourceUrl: `https://example.com/${n}`,
  type,
  status,
  savedAt,
});

// An in-memory Item repository over these rows, as the `items` table behaves for the sweep.
function itemsInMemory(...rows: Row[]) {
  const find = ({ itemId, userId }: ItemRef) =>
    rows.find((row) => row.id === itemId && row.userId === userId);
  const repository: IItemRepository = {
    findById: vi.fn(async (ref: ItemRef) => find(ref) ?? null),
    findTaggable: vi.fn(async () => null),
    markReady: vi.fn(async () => true),
    markFailed: vi.fn(async () => {}),
    findProcessingBefore: vi.fn(async (cutoff: Date, limit: number) =>
      rows
        .filter((row) => row.status === "processing" && row.savedAt < cutoff)
        .sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime())
        .slice(0, limit),
    ),
    markFailedIfProcessing: vi.fn(async (ref: ItemRef, type: ItemType) => {
      const row = find(ref);
      if (!row || row.status !== "processing") return false;
      row.status = "failed";
      row.type = type;
      return true;
    }),
  };
  return repository;
}

const sweep = (repository: IItemRepository) =>
  new SweepStuckItemsUseCase(repository).execute({ stuckAfterMs: STUCK_AFTER_MS, now: NOW });

describe("SweepStuckItemsUseCase", () => {
  it("ends an Item Processing past the threshold as Failed, a Link when it has no Item type", async () => {
    const row = rowOf(1, "processing", minutesAgo(11));

    const result = await sweep(itemsInMemory(row));

    expect(result).toEqual({ ended: 1, errors: [] });
    expect(row).toMatchObject({ status: "failed", type: "link" });
  });

  it("keeps the Item type a stuck Item already has", async () => {
    const row = rowOf(1, "processing", minutesAgo(30), "video");

    await sweep(itemsInMemory(row));

    expect(row).toMatchObject({ status: "failed", type: "video" });
  });

  it("leaves an Item Processing for less than the threshold alone", async () => {
    const row = rowOf(1, "processing", minutesAgo(9));

    const result = await sweep(itemsInMemory(row));

    expect(result).toEqual({ ended: 0, errors: [] });
    expect(row).toMatchObject({ status: "processing", type: null });
  });

  it("looks for Items older than now minus the threshold", async () => {
    const repository = itemsInMemory();

    await sweep(repository);

    expect(repository.findProcessingBefore).toHaveBeenCalledWith(
      minutesAgo(10),
      MAX_ITEMS_PER_SWEEP,
    );
  });

  it("ends at most the cap per sweep, and the next sweep ends the rest", async () => {
    const rows = Array.from({ length: MAX_ITEMS_PER_SWEEP + 3 }, (_, n) =>
      rowOf(n + 1, "processing", minutesAgo(11 + n)),
    );
    const repository = itemsInMemory(...rows);

    const first = await sweep(repository);
    const second = await sweep(repository);

    expect(first.ended).toBe(MAX_ITEMS_PER_SWEEP);
    expect(second.ended).toBe(3);
    expect(rows.every((row) => row.status === "failed")).toBe(true);
  });

  it.each(["ready", "failed"] as const)("never touches a %s Item", async (status) => {
    const row = rowOf(1, status, minutesAgo(60), "article");

    const result = await sweep(itemsInMemory(row));

    expect(result).toEqual({ ended: 0, errors: [] });
    expect(row).toMatchObject({ status, type: "article" });
  });

  it("changes nothing for an Item that became Ready after it was found", async () => {
    const row = rowOf(1, "processing", minutesAgo(11));
    const repository = itemsInMemory(row);
    vi.mocked(repository.findProcessingBefore).mockImplementationOnce(async () => {
      const found = [{ ...row }];
      // The job finishes between the listing and the update.
      row.status = "ready";
      row.type = "article";
      return found;
    });

    const result = await sweep(repository);

    expect(result).toEqual({ ended: 0, errors: [] });
    expect(row).toMatchObject({ status: "ready", type: "article" });
  });

  it("skips an Item deleted after it was found", async () => {
    const repository = itemsInMemory(rowOf(1, "processing", minutesAgo(11)));
    // The conditional update finds no row to change.
    vi.mocked(repository.markFailedIfProcessing).mockResolvedValueOnce(false);

    expect(await sweep(repository)).toEqual({ ended: 0, errors: [] });
  });

  it("ends every stuck Item and reports how many", async () => {
    const rows = [
      rowOf(1, "processing", minutesAgo(11)),
      rowOf(2, "processing", minutesAgo(45), "post"),
      rowOf(3, "processing", minutesAgo(1)),
    ];

    const result = await sweep(itemsInMemory(...rows));

    expect(result.ended).toBe(2);
    expect(rows.map((row) => row.status)).toEqual(["failed", "failed", "processing"]);
  });

  it("goes on with the other Items when one can't be ended, and hands the error back", async () => {
    // The oldest is ended first, so this one meets the error.
    const first = rowOf(1, "processing", minutesAgo(12));
    const second = rowOf(2, "processing", minutesAgo(11));
    const repository = itemsInMemory(first, second);
    const failure = new Error("Postgres answered 57014");
    vi.mocked(repository.markFailedIfProcessing).mockRejectedValueOnce(failure);

    const result = await sweep(repository);

    expect(result).toEqual({ ended: 1, errors: [{ itemId: first.id, error: failure }] });
    expect([first.status, second.status]).toEqual(["processing", "failed"]);
  });

  it("lets an error finding the Items propagate, so the caller can try again next interval", async () => {
    const repository = itemsInMemory();
    vi.mocked(repository.findProcessingBefore).mockRejectedValueOnce(new Error("Postgres is down"));

    await expect(sweep(repository)).rejects.toThrow("Postgres is down");
  });
});
