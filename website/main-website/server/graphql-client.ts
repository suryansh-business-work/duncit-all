/**
 * The site server's read side.
 *
 * Only the pages whose card cannot be known at build time ask anything, and
 * every answer is TTL-cached in process, so ordinary traffic never touches the
 * network. Every failure degrades to null: the API being slow or down must
 * never stop the site serving its pages.
 */
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? '';

const REQUEST_TIMEOUT_MS = 2500;
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry {
  value: unknown;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

const evictIfFull = (): void => {
  if (cache.size < MAX_CACHE_ENTRIES) return;
  const oldest = cache.keys().next().value;
  if (oldest !== undefined) cache.delete(oldest);
};

async function request<T>(query: string): Promise<T | null> {
  if (!GRAPHQL_URL) return null;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await globalThis.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: T; errors?: unknown[] };
    if (payload.errors?.length) return null;
    return payload.data ?? null;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/** Null answers are cached too — a deleted post would otherwise re-query on
 * every crawler retry. */
export async function cachedGql<T>(query: string, ttlMs: number): Promise<T | null> {
  const hit = cache.get(query);
  if (hit && hit.expires > Date.now()) return hit.value as T | null;
  const value = await request<T>(query);
  evictIfFull();
  cache.set(query, { value, expires: Date.now() + ttlMs });
  return value;
}
