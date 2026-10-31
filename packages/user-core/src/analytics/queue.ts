/**
 * Events wait on the device and leave in batches — one request per few seconds
 * of use instead of one per tap. A batch that fails goes back to the front of
 * the queue for the next flush (the server drops a resent event it already
 * holds), and the queue never grows past `maxQueued`: on a phone that stays
 * offline, the oldest events give way.
 */
export interface EventQueue<T> {
  /** Adds an item; sends a batch at once when one is full. */
  push(item: T): void;
  /** Sends everything queued, a batch at a time; resolves once the last batch has been answered or a send has failed. */
  flush(): Promise<void>;
  size(): number;
}

export interface EventQueueOptions<T> {
  send: (batch: T[]) => Promise<unknown>;
  maxBatch?: number;
  maxQueued?: number;
}

export function createEventQueue<T>({ send, maxBatch = 20, maxQueued = 200 }: EventQueueOptions<T>): EventQueue<T> {
  let items: T[] = [];
  let inFlight: Promise<void> | null = null;

  const keepNewest = () => {
    if (items.length > maxQueued) items = items.slice(items.length - maxQueued);
  };

  /**
   * Everything queued, a batch at a time, until the queue is empty or a send
   * fails. An item pushed while a batch is out is sent right after it rather
   * than waiting for the next flush — which is what "sends a batch the moment
   * one is full" has to mean when the full batch arrives during a send. A
   * failed batch ends the run; it is the next flush's to retry.
   */
  const drain = async () => {
    while (items.length > 0) {
      const batch = items.slice(0, maxBatch);
      items = items.slice(batch.length);
      try {
        await send(batch);
      } catch {
        // Not lost: back in front of anything queued since, for the next flush.
        items = [...batch, ...items];
        keepNewest();
        return;
      }
    }
  };

  const flush = (): Promise<void> => {
    if (inFlight) return inFlight;
    if (items.length === 0) return Promise.resolve();
    inFlight = drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    push(item) {
      items.push(item);
      keepNewest();
      // flush never rejects: a failed send is caught and re-queued above.
      if (items.length >= maxBatch) flush();
    },
    flush,
    size: () => items.length,
  };
}
