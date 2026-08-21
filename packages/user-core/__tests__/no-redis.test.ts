import { afterEach, describe, expect, it, vi } from 'vitest';

import { NO_REDIS_HEADER, NO_REDIS_STORAGE_KEY, resolveNoRedisFlag } from '../src/no-redis';

const at = (search: string) => {
  globalThis.window.history.replaceState({}, '', `/anything${search}`);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
  at('');
});

describe('the contract the server plugin reads', () => {
  it('names one storage key and one header for every surface', () => {
    expect(NO_REDIS_STORAGE_KEY).toBe('duncit_no_redis');
    expect(NO_REDIS_HEADER).toBe('x-no-redis');
  });
});

describe('resolveNoRedisFlag', () => {
  it('is off by default', () => {
    expect(resolveNoRedisFlag()).toBe(false);
  });

  it('turns on from the URL and stays sticky for the tab', () => {
    at('?noRedis=true');
    expect(resolveNoRedisFlag()).toBe(true);

    at('');
    expect(resolveNoRedisFlag()).toBe(true);
  });

  it('clears the stickiness on ?noRedis=false', () => {
    at('?noRedis=true');
    resolveNoRedisFlag();

    at('?noRedis=false');
    expect(resolveNoRedisFlag()).toBe(false);
    expect(sessionStorage.getItem(NO_REDIS_STORAGE_KEY)).toBeNull();
  });

  it('ignores a value that is neither true nor false, leaving the tab as it was', () => {
    at('?noRedis=true');
    resolveNoRedisFlag();

    at('?noRedis=maybe');
    expect(resolveNoRedisFlag()).toBe(true);
  });

  it('honours nothing and stays off when storage throws — private mode', () => {
    at('?noRedis=true');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(resolveNoRedisFlag()).toBe(false);
  });

  it('is off on the server, where there is no window at all', () => {
    vi.stubGlobal('window', undefined);

    expect(resolveNoRedisFlag()).toBe(false);
  });
});
