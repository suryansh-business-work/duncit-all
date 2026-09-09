import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInFlightRequests, subscribeRequests, trackingFetch } from '../src/lib/request-progress';

/** A fetch whose settlement the test decides. */
function deferredFetch() {
  let resolve!: (value: Response) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  vi.stubGlobal('fetch', vi.fn(() => promise));
  return { resolve, reject };
}

describe('request-progress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts a request out while it is in the air and tells every subscriber both ways', async () => {
    const pending = deferredFetch();
    const seen: number[] = [];
    const stop = subscribeRequests(() => seen.push(getInFlightRequests()));

    const call = trackingFetch('https://server.duncit.com/graphql', { method: 'POST' });
    expect(getInFlightRequests()).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://server.duncit.com/graphql', { method: 'POST' });

    const response = { ok: true } as Response;
    pending.resolve(response);
    await expect(call).resolves.toBe(response);
    expect(getInFlightRequests()).toBe(0);
    expect(seen).toEqual([1, 0]);

    // Unsubscribed listeners hear nothing more.
    stop();
    deferredFetch().resolve({ ok: true } as Response);
    await trackingFetch('https://server.duncit.com/graphql');
    expect(seen).toEqual([1, 0]);
  });

  it('releases the count on failure too, and rethrows so the caller still sees it', async () => {
    const pending = deferredFetch();
    const call = trackingFetch('https://server.duncit.com/graphql');
    expect(getInFlightRequests()).toBe(1);
    pending.reject(new TypeError('Failed to fetch'));
    await expect(call).rejects.toThrow('Failed to fetch');
    expect(getInFlightRequests()).toBe(0);
  });
});
