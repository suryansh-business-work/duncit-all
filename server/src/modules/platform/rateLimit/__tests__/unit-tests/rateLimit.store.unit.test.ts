/**
 * The rate limiter's counter store: the in-process engine local dev and CI
 * run, the Redis engine production runs, and the degrade-to-memory path when
 * Redis errors. Redis is a hand-built fake; the clock is faked.
 */
jest.mock('@config/redis', () => ({ redisConnection: jest.fn() }));
jest.mock('@observability/log', () => ({
  logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } },
}));

import { redisConnection } from '@config/redis';
import { logs } from '@observability/log';
import { block, blockedFor, consume, resetAll, storeEngine, type ConsumeInput } from '../../rateLimit.store';

const connection = redisConnection as jest.Mock;
const warn = logs.server.warn as jest.Mock;

/** A whole minute, so fixed windows start exactly here. */
const T0 = Date.parse('2026-09-01T10:00:00Z');

const at = (ms: number) => jest.setSystemTime(T0 + ms);

const input = (overrides: Partial<ConsumeInput> = {}): ConsumeInput => ({
  key: 'rule-1:ip:203.0.113.7',
  algorithm: 'FIXED_WINDOW',
  limit: 2,
  windowSeconds: 60,
  burst: 0,
  ...overrides,
});

/** A Redis MULTI chain whose exec resolves to `results`. */
const chain = (results: unknown) => {
  const c: Record<string, jest.Mock> = {};
  for (const cmd of ['incr', 'pexpire', 'zremrangebyscore', 'zadd', 'zcard']) {
    c[cmd] = jest.fn(() => c);
  }
  c.exec = jest.fn().mockResolvedValue(results);
  return c;
};

const fakeRedis = (overrides: Record<string, unknown> = {}) => ({
  eval: jest.fn(),
  multi: jest.fn(),
  zrange: jest.fn(),
  pttl: jest.fn(),
  set: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
  ...overrides,
});

beforeEach(async () => {
  jest.useFakeTimers();
  at(0);
  connection.mockReturnValue(null);
  await resetAll();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('memory engine — FIXED_WINDOW', () => {
  it('counts up to the limit, then reports a breach until the wall-clock window rolls', async () => {
    at(10_000);
    await expect(consume(input())).resolves.toEqual({ count: 1, remaining: 1, resetSeconds: 50, exceeded: false });
    await expect(consume(input())).resolves.toEqual({ count: 2, remaining: 0, resetSeconds: 50, exceeded: false });
    at(59_500);
    await expect(consume(input())).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 1, exceeded: true });

    at(60_000);
    await expect(consume(input())).resolves.toEqual({ count: 1, remaining: 1, resetSeconds: 60, exceeded: false });
  });

  it('keeps a separate count per key', async () => {
    await consume(input());
    await consume(input());
    await expect(consume(input({ key: 'rule-1:ip:203.0.113.8' }))).resolves.toMatchObject({ count: 1 });
  });
});

describe('memory engine — SLIDING_WINDOW', () => {
  const sliding = input({ algorithm: 'SLIDING_WINDOW', windowSeconds: 10 });

  it('counts only requests inside the trailing window and resets when the oldest ages out', async () => {
    await expect(consume(sliding)).resolves.toEqual({ count: 1, remaining: 1, resetSeconds: 10, exceeded: false });
    at(4_000);
    await expect(consume(sliding)).resolves.toEqual({ count: 2, remaining: 0, resetSeconds: 6, exceeded: false });
    at(8_000);
    await expect(consume(sliding)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 2, exceeded: true });
    // The request at 0 s has left the window; 4 s and 8 s are still in it.
    at(12_000);
    await expect(consume(sliding)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 2, exceeded: true });
  });

  it('starts over once the key has been idle for a whole window', async () => {
    await consume(sliding);
    await consume(sliding);
    at(25_000);
    await expect(consume(sliding)).resolves.toMatchObject({ count: 1, exceeded: false });
  });
});

describe('memory engine — TOKEN_BUCKET', () => {
  // limit 2 per 10 s plus a burst of 1: capacity 3, refilling 0.2 tokens a second.
  const bucket = input({ algorithm: 'TOKEN_BUCKET', limit: 2, burst: 1, windowSeconds: 10 });

  it('spends the burst capacity, refuses when empty, and refills over time', async () => {
    await expect(consume(bucket)).resolves.toEqual({ count: 1, remaining: 2, resetSeconds: 10, exceeded: false });
    await expect(consume(bucket)).resolves.toEqual({ count: 2, remaining: 1, resetSeconds: 10, exceeded: false });
    await expect(consume(bucket)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 10, exceeded: false });
    // Empty: one token takes 5 s to come back.
    await expect(consume(bucket)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 5, exceeded: true });

    at(6_000);
    await expect(consume(bucket)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 10, exceeded: false });
  });

  it('never refills past capacity', async () => {
    await consume(bucket);
    at(9_000);
    // 1.8 tokens regained on top of 2 would be 3.8 — capped at 3.
    await expect(consume(bucket)).resolves.toMatchObject({ remaining: 2, exceeded: false });
  });

  it('reports at least one second to wait even when a token is nearly back', async () => {
    for (let i = 0; i < 3; i += 1) await consume(bucket);
    at(4_999);
    await expect(consume(bucket)).resolves.toMatchObject({ exceeded: true, resetSeconds: 1 });
  });
});

describe('redis engine', () => {
  it('runs the token bucket as one Lua call and reads an allowed answer', async () => {
    const redis = fakeRedis({ eval: jest.fn().mockResolvedValue([1, '1.5']) });
    connection.mockReturnValue(redis);
    const bucket = input({ algorithm: 'TOKEN_BUCKET', limit: 2, burst: 1, windowSeconds: 10 });

    await expect(consume(bucket)).resolves.toEqual({ count: 2, remaining: 1, resetSeconds: 10, exceeded: false });
    const [script, numKeys, key, capacity, refill, now, ttl] = redis.eval.mock.calls[0];
    expect(script).toContain('HMGET');
    expect([numKeys, key, capacity, refill, now, ttl]).toEqual([1, `rl:${bucket.key}`, '3', String(2 / 10_000), String(T0), '20000']);
  });

  it('reads a refused token-bucket answer as a breach with the time to the next token', async () => {
    connection.mockReturnValue(fakeRedis({ eval: jest.fn().mockResolvedValue([0, '0.5']) }));
    const bucket = input({ algorithm: 'TOKEN_BUCKET', limit: 2, burst: 1, windowSeconds: 10 });
    // Half a token missing at 0.2 tokens/s is 2.5 s, rounded up.
    await expect(consume(bucket)).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 3, exceeded: true });
  });

  it('counts a fixed window with INCR on a per-window key', async () => {
    const multi = chain([[null, 3], [null, 1]]);
    connection.mockReturnValue(fakeRedis({ multi: jest.fn(() => multi) }));
    at(15_000);
    await expect(consume(input())).resolves.toEqual({ count: 3, remaining: 0, resetSeconds: 45, exceeded: true });
    expect(multi.incr).toHaveBeenCalledWith(`rl:${input().key}:${T0}`);
    expect(multi.pexpire).toHaveBeenCalledWith(`rl:${input().key}:${T0}`, 60_000);
  });

  it('reads an empty MULTI answer as zero', async () => {
    connection.mockReturnValue(fakeRedis({ multi: jest.fn(() => chain(null)) }));
    await expect(consume(input())).resolves.toEqual({ count: 0, remaining: 2, resetSeconds: 60, exceeded: false });
  });

  it('counts a sliding window as a sorted-set cardinality and skips the oldest lookup under the limit', async () => {
    const multi = chain([[null, 0], [null, 1], [null, 2], [null, 1]]);
    const redis = fakeRedis({ multi: jest.fn(() => multi) });
    connection.mockReturnValue(redis);
    const sliding = input({ algorithm: 'SLIDING_WINDOW', limit: 5, windowSeconds: 10 });

    await expect(consume(sliding)).resolves.toEqual({ count: 2, remaining: 3, resetSeconds: 10, exceeded: false });
    expect(multi.zremrangebyscore).toHaveBeenCalledWith(`rl:${sliding.key}`, 0, T0 - 10_000);
    expect(multi.zadd).toHaveBeenCalledWith(`rl:${sliding.key}`, T0, expect.stringMatching(new RegExp(`^${T0}-\\d+$`)));
    expect(redis.zrange).not.toHaveBeenCalled();
  });

  it('on a sliding breach reads the oldest member to say when the window frees up', async () => {
    const redis = fakeRedis({
      multi: jest.fn(() => chain([[null, 0], [null, 1], [null, 6], [null, 1]])),
      zrange: jest.fn().mockResolvedValue(['m', String(T0 - 4_000)]),
    });
    connection.mockReturnValue(redis);
    const sliding = input({ algorithm: 'SLIDING_WINDOW', limit: 5, windowSeconds: 10 });

    await expect(consume(sliding)).resolves.toEqual({ count: 6, remaining: 0, resetSeconds: 6, exceeded: true });
    expect(redis.zrange).toHaveBeenCalledWith(`rl:${sliding.key}`, '0', '0', 'WITHSCORES');
  });

  it('falls back to a full window when the oldest member cannot be read', async () => {
    connection.mockReturnValue(
      fakeRedis({
        multi: jest.fn(() => chain([[null, 0], [null, 1], [null, 9], [null, 1]])),
        zrange: jest.fn().mockResolvedValue([]),
      })
    );
    await expect(consume(input({ algorithm: 'SLIDING_WINDOW', limit: 5, windowSeconds: 10 }))).resolves.toMatchObject({
      exceeded: true,
      resetSeconds: 10,
    });
  });

  it('reads an empty sliding MULTI answer as zero', async () => {
    connection.mockReturnValue(fakeRedis({ multi: jest.fn(() => chain(undefined)) }));
    await expect(consume(input({ algorithm: 'SLIDING_WINDOW' }))).resolves.toMatchObject({ count: 0, exceeded: false });
  });

  it('degrades to the memory counter, with a warning, when Redis errors', async () => {
    const boom = new Error('ECONNRESET');
    connection.mockReturnValue(fakeRedis({ eval: jest.fn().mockRejectedValue(boom) }));
    const bucket = input({ algorithm: 'TOKEN_BUCKET', limit: 2, burst: 0, windowSeconds: 10 });
    await expect(consume(bucket)).resolves.toEqual({ count: 1, remaining: 1, resetSeconds: 10, exceeded: false });
    expect(warn).toHaveBeenCalledWith('rateLimit', 'consume', { error: boom, key: bucket.key });
  });
});

describe('cool-off blocks', () => {
  it('does nothing for a zero-second block', async () => {
    const redis = fakeRedis();
    connection.mockReturnValue(redis);
    await block('k', 0);
    expect(redis.set).not.toHaveBeenCalled();
    connection.mockReturnValue(null);
    await expect(blockedFor('k')).resolves.toBe(0);
  });

  it('keeps a block in memory without Redis and lets it lapse', async () => {
    await block('k', 30);
    await expect(blockedFor('k')).resolves.toBe(30);
    at(29_100);
    await expect(blockedFor('k')).resolves.toBe(1);
    at(31_000);
    await expect(blockedFor('k')).resolves.toBe(0);
    await expect(blockedFor('never-blocked')).resolves.toBe(0);
  });

  it('drops a lapsed block when the counters are next swept', async () => {
    await consume(input({ key: 'stale' }));
    await block('k', 5);
    // A day on: far past any earlier sweep, so this consume sweeps.
    at(86_400_000);
    await consume(input({ key: 'other' }));
    at(0);
    // The clock moved back to inside the block, but the sweep already removed it.
    await expect(blockedFor('k')).resolves.toBe(0);
  });

  it('sets the block in Redis with an expiry and reads its TTL back', async () => {
    const redis = fakeRedis({ pttl: jest.fn().mockResolvedValue(4_500) });
    connection.mockReturnValue(redis);
    await block('k', 30);
    expect(redis.set).toHaveBeenCalledWith('rlb:k', '1', 'EX', 30);
    await expect(blockedFor('k')).resolves.toBe(5);
    expect(redis.pttl).toHaveBeenCalledWith('rlb:k');
  });

  it('reads a missing Redis key (negative TTL) as not blocked', async () => {
    connection.mockReturnValue(fakeRedis({ pttl: jest.fn().mockResolvedValue(-2) }));
    await expect(blockedFor('k')).resolves.toBe(0);
  });

  it('falls back to memory when Redis refuses to set or read a block', async () => {
    const boom = new Error('READONLY');
    connection.mockReturnValue(fakeRedis({ set: jest.fn().mockRejectedValue(boom), pttl: jest.fn().mockRejectedValue(boom) }));
    await block('k', 20);
    expect(warn).toHaveBeenCalledWith('rateLimit', 'block', { error: boom, key: 'k' });
    await expect(blockedFor('k')).resolves.toBe(20);
    expect(warn).toHaveBeenCalledWith('rateLimit', 'blockedFor', { error: boom, key: 'k' });
  });
});

describe('storeEngine / resetAll', () => {
  it('names the engine that will answer', () => {
    expect(storeEngine()).toBe('MEMORY');
    connection.mockReturnValue(fakeRedis());
    expect(storeEngine()).toBe('REDIS');
  });

  it('forgets every memory counter and block', async () => {
    await consume(input());
    await consume(input());
    await block('k', 60);
    await resetAll();
    await expect(consume(input())).resolves.toMatchObject({ count: 1 });
    await expect(blockedFor('k')).resolves.toBe(0);
  });

  it('scans Redis page by page and deletes only pages that found keys', async () => {
    const redis = fakeRedis({
      scan: jest
        .fn()
        .mockResolvedValueOnce(['17', ['rl:a', 'rlb:b']])
        .mockResolvedValueOnce(['42', []])
        .mockResolvedValueOnce(['0', ['rl:c']]),
    });
    connection.mockReturnValue(redis);
    await resetAll();
    expect(redis.scan.mock.calls.map((c: unknown[]) => c[0])).toEqual(['0', '17', '42']);
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'rl*:*', 'COUNT', 500);
    expect(redis.del.mock.calls).toEqual([['rl:a', 'rlb:b'], ['rl:c']]);
  });

  it('warns and still clears memory when the Redis sweep fails', async () => {
    await consume(input());
    const boom = new Error('LOADING');
    connection.mockReturnValue(fakeRedis({ scan: jest.fn().mockRejectedValue(boom) }));
    await resetAll();
    expect(warn).toHaveBeenCalledWith('rateLimit', 'resetAll', { error: boom });
    connection.mockReturnValue(null);
    await expect(consume(input())).resolves.toMatchObject({ count: 1 });
  });
});
