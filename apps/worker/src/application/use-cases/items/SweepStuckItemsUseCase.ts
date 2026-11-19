import { inject, injectable } from "inversify";
import type { SweepStuckItemsResult } from "@/application/dto/items/SweepStuckItemsResult";
import { WORKER_TOKENS } from "@/di/tokens";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import { failedItemType } from "@/domain/rules/failedItemType";

/**
 * The most Items one sweep ends. After a queue flush every lost Item is stuck at
 * once; the oldest go first and the rest wait for the next sweep, so one run
 * stays short.
 */
export const MAX_ITEMS_PER_SWEEP = 500;

export interface SweepStuckItemsInput {
  /** How long (ms) an Item may stay Processing before it counts as stuck. */
  stuckAfterMs: number;
  /** The time to measure from; now unless a test says otherwise. */
  now?: Date;
}

/**
 * Ends the Items stuck in Processing the way a final failure does: Failed, and a
 * Link when the Item has no Item type yet. An Item ends up stuck when its job was
 * lost (a flushed queue) or its final-failure step threw. An Item counts as
 * stuck once it has been Processing for `stuckAfterMs`, measured from when it was
 * saved.
 *
 * Each Item is only marked Failed while it is still Processing, so a job that
 * finishes between finding it and ending it wins, and a sweep never overwrites
 * Ready. A job that finishes after the sweep may still turn Failed into Ready.
 * At most `MAX_ITEMS_PER_SWEEP` Items are ended per sweep, the oldest first.
 * Items are ended one at a time: one that can't be is handed back and the rest
 * go on. An error finding the Items propagates, for the caller to try again next
 * time.
 */
@injectable()
export class SweepStuckItemsUseCase {
  constructor(@inject(WORKER_TOKENS.ItemRepository) private readonly items: IItemRepository) {}

  async execute({
    stuckAfterMs,
    now = new Date(),
  }: SweepStuckItemsInput): Promise<SweepStuckItemsResult> {
    const stuck = await this.items.findProcessingBefore(
      new Date(now.getTime() - stuckAfterMs),
      MAX_ITEMS_PER_SWEEP,
    );

    const result: SweepStuckItemsResult = { ended: 0, errors: [] };
    for (const item of stuck) {
      try {
        const ended = await this.items.markFailedIfProcessing(
          { itemId: item.id, userId: item.userId },
          failedItemType(item.type),
        );
        if (ended) result.ended += 1;
      } catch (error) {
        result.errors.push({ itemId: item.id, error });
      }
    }
    return result;
  }
}
