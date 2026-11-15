/** Which Item to tag, and whose: only the ids, never captured content. */
export interface TagItemRequest {
  itemId: string;
  userId: string;
}

/** Hands the worker's follow-up work back to the queue. The queue adapter implements it. */
export interface IQueueProvider {
  /** Enqueues a Tag Item job, which runs the Item's AI tagging. */
  enqueueTagItem(request: TagItemRequest): Promise<void>;
}
