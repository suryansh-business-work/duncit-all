import { redisConnection } from '@config/redis';
import { logs } from '@observability/log';
import type { RateLimitAlgorithm } from './rateLimit.types';

/**
 * Where the allowance actually lives.
 *
 * Two implementations of one interface, chosen per call by whether Redis is
 * connected. This is not a fallback in the "two code paths for the same job"
 * sense rule 17 warns about — it is one job (count requests in a window) with
 * the only two storage engines the platform has. Redis is the correct one and
 * is what production runs; the in-process map is what local dev and CI get,
 * where REDIS_URL is unset and there is exactly one process, so a per-process
 * counter and a shared counter are the same number.
 *
 * A Redis error degrades to the memory counter for that request rather than
 * failing it: a limiter that 500s when its store blinks is worse than the
 * traffic it was protecting against.
 */

export interface ConsumeInput {
  /** Fully-qualified counter key: rule id + the identity it counts per. */
  key: string;
  algorithm: RateLimitAlgorithm;
  limit: number;
  windowSeconds: number;
  /** TOKEN_BUCKET only: allowance above `limit` available in one burst. */
  burst: number;
}

export interface ConsumeResult {
  /** Requests counted in the current window, including this one. */
  count: number;
  /** How many are left before the limit bites (never negative). */
  remaining: number;
  /** Seconds until the allowance recovers. */
  resetSeconds: number;
  exceeded: boolean;
}

/* ------------------------------ memory engine ----------------------------- */

interface MemoryEntry {
  /** Request timestamps (sliding), or a single window marker (fixed). */
  stamps: number[];
  /** TOKEN_BUCKET: tokens left and when they were last refilled. */
  tokens: number;
  refilledAt: number;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();
/** Blocks (cool-off after a breach) kept beside the counters, same lifecycle. */
const memoryBlocks = new Map<string, number>();

/** Drop everything already expired, so the maps track live traffic only. */
function sweepMemory(now: number): void {
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= now) memory.delete(key);
  }
  for (const [key, until] of memoryBlocks) {
    if (until <= now) memoryBlocks.delete(key);
  }
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 30_000;

function memoryEntry(key: string, now: number, windowMs: number, capacity: number): MemoryEntry {
  const existing = memory.get(key);
  if (existing && existing.expiresAt > now) return existing;
  const fresh: MemoryEntry = {
    stamps: [],
    tokens: capacity,
    refilledAt: now,
    expiresAt: now + windowMs,
  };
  memory.set(key, fresh);
  return fresh;
}

function consumeMemory(input: ConsumeInput): ConsumeResult {
  const now = Date.now();
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    lastSweep = now;
    sweepMemory(now);
  }
  const windowMs = input.windowSeconds * 1000;
  const capacity = input.limit + input.burst;

  if (input.algorithm === 'TOKEN_BUCKET') {
    const entry = memoryEntry(input.key, now, windowMs, capacity);
    const refillPerMs = input.limit / windowMs;
    const gained = (now - entry.refilledAt) * refillPerMs;
    entry.tokens = Math.min(capacity, entry.tokens + gained);
    entry.refilledAt = now;
    entry.expiresAt = now + windowMs;
    if (entry.tokens < 1) {
      const waitMs = (1 - entry.tokens) / refillPerMs;
      return {
        count: capacity,
        remaining: 0,
        resetSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
        exceeded: true,
      };
    }
    entry.tokens -= 1;
    return {
      count: Math.round(capacity - entry.tokens),
      remaining: Math.floor(entry.tokens),
      resetSeconds: input.windowSeconds,
      exceeded: false,
    };
  }

  if (input.algorithm === 'FIXED_WINDOW') {
    // One bucket per wall-clock window, so every caller in the same window
    // shares the same reset instant — which is the whole point of "fixed".
    const bucketStart = Math.floor(now / windowMs) * windowMs;
    const entry = memoryEntry(`${input.key}:${bucketStart}`, now, windowMs, capacity);
    entry.stamps.push(now);
    entry.expiresAt = bucketStart + windowMs;
    const count = entry.stamps.length;
    const resetSeconds = Math.max(1, Math.ceil((bucketStart + windowMs - now) / 1000));
    return {
      count,
      remaining: Math.max(0, input.limit - count),
      resetSeconds,
      exceeded: count > input.limit,
    };
  }

  const entry = memoryEntry(input.key, now, windowMs, capacity);
  entry.stamps = entry.stamps.filter((t) => now - t < windowMs);
  entry.stamps.push(now);
  entry.expiresAt = now + windowMs;
  const count = entry.stamps.length;
  const oldest = entry.stamps[0] ?? now;
  return {
    count,
    remaining: Math.max(0, input.limit - count),
    resetSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    exceeded: count > input.limit,
  };
}

/* ------------------------------- redis engine ----------------------------- */

/**
 * Token bucket in one round trip.
 *
 * Read-modify-write from Node would let two concurrent requests both read the
 * same token count and both spend it, which is exactly the case a limiter
 * exists to catch, so the whole refill-and-spend has to happen inside Redis.
 */
const TOKEN_BUCKET_LUA = `
local tokens_key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local data = redis.call('HMGET', tokens_key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  ts = now
end
tokens = math.min(capacity, tokens + (now - ts) * refill_per_ms)
local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end
redis.call('HSET', tokens_key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', tokens_key, ttl)
return { allowed, tostring(tokens) }
`;

async function consumeRedisTokenBucket(input: ConsumeInput): Promise<ConsumeResult | null> {
  const client = redisConnection();
  if (!client) return null;
  const windowMs = input.windowSeconds * 1000;
  const capacity = input.limit + input.burst;
  const refillPerMs = input.limit / windowMs;
  const raw = (await client.eval(
    TOKEN_BUCKET_LUA,
    1,
    `rl:${input.key}`,
    String(capacity),
    String(refillPerMs),
    String(Date.now()),
    String(windowMs * 2),
  )) as [number, string];
  const tokens = Number(raw[1]);
  if (raw[0] === 1) {
    return {
      count: Math.round(capacity - tokens),
      remaining: Math.floor(tokens),
      resetSeconds: input.windowSeconds,
      exceeded: false,
    };
  }
  return {
    count: capacity,
    remaining: 0,
    resetSeconds: Math.max(1, Math.ceil((1 - tokens) / refillPerMs / 1000)),
    exceeded: true,
  };
}

async function consumeRedisFixed(input: ConsumeInput): Promise<ConsumeResult | null> {
  const client = redisConnection();
  if (!client) return null;
  const windowMs = input.windowSeconds * 1000;
  const bucketStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `rl:${input.key}:${bucketStart}`;
  const results = await client
    .multi()
    .incr(key)
    .pexpire(key, windowMs)
    .exec();
  const count = Number(results?.[0]?.[1] ?? 0);
  return {
    count,
    remaining: Math.max(0, input.limit - count),
    resetSeconds: Math.max(1, Math.ceil((bucketStart + windowMs - Date.now()) / 1000)),
    exceeded: count > input.limit,
  };
}

async function consumeRedisSliding(input: ConsumeInput): Promise<ConsumeResult | null> {
  const client = redisConnection();
  if (!client) return null;
  const now = Date.now();
  const windowMs = input.windowSeconds * 1000;
  const key = `rl:${input.key}`;
  // A member per request. The score is the timestamp, so trimming the window is
  // one range delete and the count is a cardinality — no timestamps in Node.
  const member = `${now}-${Math.floor(now * 997) % 100000}`;
  const results = await client
    .multi()
    .zremrangebyscore(key, 0, now - windowMs)
    .zadd(key, now, member)
    .zcard(key)
    .pexpire(key, windowMs)
    .exec();
  const count = Number(results?.[2]?.[1] ?? 0);
  const exceeded = count > input.limit;
  // The exact reset is when the OLDEST request in the window ages out, which
  // costs a second round trip — so it is only asked for on a breach, where it
  // is the number the caller is about to be shown.
  let oldest = now;
  if (exceeded) {
    const first = await client.zrange(key, '0', '0', 'WITHSCORES');
    oldest = Number(first[1] ?? now);
  }
  return {
    count,
    remaining: Math.max(0, input.limit - count),
    resetSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    exceeded,
  };
}

/* --------------------------------- surface -------------------------------- */

/** Spend one request against `key`, and say what is left. */
export async function consume(input: ConsumeInput): Promise<ConsumeResult> {
  try {
    let result: ConsumeResult | null = null;
    if (input.algorithm === 'TOKEN_BUCKET') result = await consumeRedisTokenBucket(input);
    else if (input.algorithm === 'FIXED_WINDOW') result = await consumeRedisFixed(input);
    else result = await consumeRedisSliding(input);
    if (result) return result;
  } catch (err) {
    logs.server.warn('rateLimit', 'consume', { error: err, key: input.key });
  }
  return consumeMemory(input);
}

/** Seconds remaining on an active cool-off for `key`, or 0. */
export async function blockedFor(key: string): Promise<number> {
  const client = redisConnection();
  if (client) {
    try {
      const ttl = await client.pttl(`rlb:${key}`);
      return Math.max(0, Math.ceil(ttl / 1000));
    } catch (err) {
      logs.server.warn('rateLimit', 'blockedFor', { error: err, key });
    }
  }
  const until = memoryBlocks.get(key);
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/** Start a cool-off for `key`, refusing it outright until it lapses. */
export async function block(key: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const client = redisConnection();
  if (client) {
    try {
      await client.set(`rlb:${key}`, '1', 'EX', seconds);
      return;
    } catch (err) {
      logs.server.warn('rateLimit', 'block', { error: err, key });
    }
  }
  memoryBlocks.set(key, Date.now() + seconds * 1000);
}

/** Which engine answered — reported on the Settings page so it is not a guess. */
export function storeEngine(): 'REDIS' | 'MEMORY' {
  return redisConnection() ? 'REDIS' : 'MEMORY';
}

/** Forget every counter and cool-off. Used by the console's "reset counters". */
export async function resetAll(): Promise<void> {
  memory.clear();
  memoryBlocks.clear();
  const client = redisConnection();
  if (!client) return;
  try {
    // SCAN rather than KEYS: the limiter's keys sit in the same database as the
    // response cache, and KEYS blocks the server for the length of the sweep.
    let cursor = '0';
    do {
      const [next, found] = await client.scan(cursor, 'MATCH', 'rl*:*', 'COUNT', 500);
      cursor = next;
      if (found.length > 0) await client.del(...found);
    } while (cursor !== '0');
  } catch (err) {
    logs.server.warn('rateLimit', 'resetAll', { error: err });
  }
}
