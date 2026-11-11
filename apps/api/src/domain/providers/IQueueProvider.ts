/** Which Item to process, and whose. */
export interface ProcessItemRequest {
  itemId: string;
  userId: string;
  /** Captured page content (issue #143/#145), passed through unchanged to the worker. */
  html?: string;
  /** A video's plain caption text (issue #164), passed through unchanged to the worker. */
  captions?: string;
}

/** Hands background work to the worker. The queue adapter implements it. */
export interface IQueueProvider {
  /** Enqueues a Process Item job for the worker to run the Item's Processing. */
  enqueueProcessItem(request: ProcessItemRequest): Promise<void>;
}
