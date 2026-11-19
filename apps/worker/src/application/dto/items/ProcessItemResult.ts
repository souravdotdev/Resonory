import type { ReadyItem } from "@/domain/entities/Item";

/**
 * Ready with what Processing learned (Item type, title, description,
 * Thumbnail key and Text), or missing: the Item was deleted (or isn't the
 * User's), so there's nothing to do. `already_ready` means the Item was Ready
 * before the job ran, so nothing was done. A Ready result carries `textError` only
 * when the Text extractor threw: the Item is Ready without that Text all the
 * same, and the processor logs the failure (the use case itself never logs).
 * It carries `textMs`, how long the extractor ran, only when it ran, and
 * `tagQueueError` only when its AI tagging couldn't be queued: it's Ready,
 * without AI Tags, all the same.
 */
export type ProcessItemResult =
  | ({
      outcome: "ready";
      textError?: unknown;
      textMs?: number;
      tagQueueError?: unknown;
    } & ReadyItem)
  | { outcome: "already_ready" }
  | { outcome: "missing" };
