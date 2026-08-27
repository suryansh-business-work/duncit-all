/**
 * Redis connection + tiny JSON cache API (gated on REDIS_URL).
 *
 * Infra-level config like Mongo: REDIS_URL comes from server.env written by
 * the deploy workflow (redis://redis:6379 — the `redis` compose service on the
 * stack's own network), never from the Tech portal's EnvEntry store. Unset
 * (local dev, tests) = caching off and every call here is a cheap no-op — the
 * server never NEEDS Redis to boot or to serve a request.
 */
import Redis from 'ioredis';
import { logs } from '../observability/log';

let client: Redis | null = null;
let connected = false;

export function initRedis(): void {
  const url = process.env.REDIS_URL;
  if (!url || client) return;
  client = new Redis(url, {
    // Fail fast: a down Redis must degrade to "no cache" for the request in
    // flight, never queue work against a dead connection.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  });
  client.on('ready', () => {
    connected = true;
    logs.server.info('redis', 'connection', { msg: 'Redis connected' });
  });
  client.on('error', (err) => {
    // Log the edge only — ioredis emits 'error' on every failed reconnect
    // attempt, and a Redis outage must not flood the log store.
    if (connected) {
      logs.server.error('redis', 'connection', { error: err, msg: 'Redis connection lost' });
    }
    connected = false;
  });
  client.on('end', () => {
    connected = false;
  });
}

export function redisAvailable(): boolean {
  return connected;
}

/**
 * The live connection, or null when there isn't one.
 *
 * The JSON helpers below cover caching, which is the only thing that needs a
 * value round-tripped. The rate limiter needs atomic counters instead — INCR,
 * sorted sets, a token-bucket script — and those cannot be expressed as
 * get/set without losing the atomicity that makes them correct under
 * concurrency. It reaches for the client directly rather than growing five
 * more wrappers here.
 */
export function redisConnection(): Redis | null {
  return client && connected ? client : null;
}

/** 'off' (no REDIS_URL) | 'connected' | 'disconnected' — for GET /health. */
export function redisStatus(): string {
  if (!client) return 'off';
  if (connected) return 'connected';
  return 'disconnected';
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client || !connected) return null;
  try {
    const raw = await client.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    // A cache read failure (connection blip, corrupt entry) is a miss for the
    // request in flight — but still worth a log line, since a GET that keeps
    // failing while `connected` stays true (auth error, OOM, wrong-type key)
    // silently defeats the whole cache with no other visible symptom.
    logs.server.warn('redis', 'cacheGet', { error: err, key });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!client || !connected) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    // A cache write failure must never surface to the request that produced
    // the value — the next request simply recomputes. Logged for the same
    // reason as cacheGet: a maxmemory/OOM condition here would otherwise be
    // invisible ("Redis is not storing the data" with no trace of why).
    logs.server.warn('redis', 'cacheSet', { error: err, key });
  }
}
