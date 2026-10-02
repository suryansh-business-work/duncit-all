/**
 * The per-request loader cache. What matters: sibling resolvers asking in the
 * same tick share ONE fetch (the N+1 fix), a later ask is a cache hit, a
 * missing id is remembered as missing, and a failed fetch is not cached.
 */
import { loadMany, loadOne, primeMany } from '@utils/request-cache';

const fetcherOf = (records: Record<string, string>) =>
  jest.fn(async (ids: string[]) => new Map(ids.filter((id) => id in records).map((id) => [id, records[id]])));

describe('request-cache', () => {
  it('fetches ids asked for by sibling resolvers in the same tick in one call', async () => {
    const ctx = {};
    const fetch = fetcherOf({ u1: 'Asha', u2: 'Kabir', u3: 'Meera' });
    const names = await Promise.all([
      loadOne(ctx, 'user', 'u1', fetch),
      loadOne(ctx, 'user', 'u2', fetch),
      loadOne(ctx, 'user', 'u3', fetch),
      loadOne(ctx, 'user', 'u1', fetch),
    ]);
    expect(names).toEqual(['Asha', 'Kabir', 'Meera', 'Asha']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(['u1', 'u2', 'u3']);
  });

  it('answers a later ask from the cache and fetches only what is new', async () => {
    const ctx = {};
    const fetch = fetcherOf({ u1: 'Asha', u2: 'Kabir' });
    await loadOne(ctx, 'user', 'u1', fetch);
    const found = await loadMany(ctx, 'user', ['u1', 'u2'], fetch);
    expect([...found.values()]).toEqual(['Asha', 'Kabir']);
    expect(fetch).toHaveBeenNthCalledWith(2, ['u2']);
  });

  it('remembers that an id has no record', async () => {
    const ctx = {};
    const fetch = fetcherOf({});
    expect(await loadOne(ctx, 'user', 'gone', fetch)).toBeNull();
    expect(await loadOne(ctx, 'user', 'gone', fetch)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caches nothing from a failed fetch, so the next ask tries again', async () => {
    const ctx = {};
    const fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Mongo is down'))
      .mockResolvedValueOnce(new Map([['u1', 'Asha']]));
    await expect(loadOne(ctx, 'user', 'u1', fetch)).rejects.toThrow('Mongo is down');
    expect(await loadOne(ctx, 'user', 'u1', fetch)).toBe('Asha');
  });

  it('returns null for an absent id without fetching', async () => {
    const fetch = fetcherOf({});
    expect(await loadOne({}, 'user', null, fetch)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('primes a page and swallows a failed prime', async () => {
    const ctx = {};
    const fetch = fetcherOf({ u1: 'Asha' });
    await primeMany(ctx, 'user', ['u1'], fetch);
    expect(await loadOne(ctx, 'user', 'u1', fetch)).toBe('Asha');
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(primeMany({}, 'user', ['u9'], jest.fn().mockRejectedValue(new Error('down')))).resolves.toBeUndefined();
    await expect(primeMany({}, 'user', [], fetch)).resolves.toBeUndefined();
  });
});
