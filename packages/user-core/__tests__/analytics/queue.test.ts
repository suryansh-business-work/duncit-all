import { describe, expect, it, vi } from 'vitest';
import { createEventQueue } from '../../src/analytics/queue';

describe('createEventQueue', () => {
  it('sends nothing until asked, then one batch of at most maxBatch', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = createEventQueue<number>({ send, maxBatch: 3 });
    queue.push(1);
    queue.push(2);
    expect(send).not.toHaveBeenCalled();
    await queue.flush();
    expect(send).toHaveBeenCalledWith([1, 2]);
    expect(queue.size()).toBe(0);
  });

  it('sends a batch by itself the moment one is full', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = createEventQueue<number>({ send, maxBatch: 2 });
    queue.push(1);
    queue.push(2);
    queue.push(3);
    await queue.flush();
    expect(send).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(send).toHaveBeenNthCalledWith(2, [3]);
  });

  it('puts a failed batch back in front of what was queued since', async () => {
    let fail = true;
    const sent: number[][] = [];
    const queue = createEventQueue<number>({
      maxBatch: 10,
      send: async (batch) => {
        if (fail) throw new Error('offline');
        sent.push(batch);
      },
    });
    queue.push(1);
    const failing = queue.flush();
    queue.push(2);
    await failing;
    expect(queue.size()).toBe(2);
    fail = false;
    await queue.flush();
    expect(sent).toEqual([[1, 2]]);
  });

  it('keeps only the newest maxQueued items while sends keep failing', async () => {
    const send = vi.fn().mockRejectedValue(new Error('offline'));
    const queue = createEventQueue<number>({ send, maxBatch: 10, maxQueued: 3 });
    [1, 2, 3, 4].forEach((n) => queue.push(n));
    expect(queue.size()).toBe(3);
    await queue.flush();
    expect(send).toHaveBeenCalledWith([2, 3, 4]);
    queue.push(5);
    expect(queue.size()).toBe(3);
    send.mockResolvedValue(undefined);
    await queue.flush();
    expect(send).toHaveBeenLastCalledWith([3, 4, 5]);
  });

  it('drops the oldest of a failed batch when newer items fill the queue meanwhile', async () => {
    let release: () => void = () => undefined;
    const send = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          release = () => reject(new Error('offline'));
        })
    );
    const queue = createEventQueue<number>({ send, maxBatch: 2, maxQueued: 3 });
    queue.push(1);
    queue.push(2);
    queue.push(3);
    queue.push(4);
    release();
    await queue.flush();
    expect(queue.size()).toBe(3);
  });

  it('answers the flush already under way instead of sending twice', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = createEventQueue<number>({ send });
    queue.push(1);
    const first = queue.flush();
    const second = queue.flush();
    expect(second).toBe(first);
    await first;
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('resolves at once with nothing queued', async () => {
    const send = vi.fn();
    await createEventQueue<number>({ send }).flush();
    expect(send).not.toHaveBeenCalled();
  });
});
