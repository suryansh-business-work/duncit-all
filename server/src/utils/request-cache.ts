/**
 * Per-request entity caches for GraphQL field resolvers.
 *
 * A list query returns N rows and GraphQL then runs every field resolver once
 * PER ROW. A field resolver that reads the database therefore costs N round
 * trips, not one — the classic N+1. `pods` selecting `host_names` was issuing
 * one `UserModel.find` per pod, so a 400-pod home feed spent 400 round trips on
 * a lookup that is a single `$in` query.
 *
 * The cure here is a cache keyed by ENTITY ID and scoped to one request, not a
 * cache keyed by row. A resolver asks for the ids it needs; anything already
 * loaded during this request is answered from memory and only the genuinely
 * missing ids reach Mongo. The list resolver then PRIMES the cache with every
 * row's ids up front, which collapses the whole fan-out into one query while
 * leaving each field resolver correct on its own — a single-row read (`pod`,
 * `podBySlugs`) fetches exactly what it needs with no priming step.
 *
 * The cache lives on the GraphQL context, so it dies with the request: no
 * cross-request staleness, and nothing to invalidate. `resolvePodPlace` already
 * memoises this way (`__podPlaceCache`) — this generalises the same idea.
 */

/** Whatever carries the cache: the GraphQL context, or a plain object for the
 * one-off callers (share-link unfurling) that resolve a pod outside a request. */
export type CacheCarrier = object;

const STORE_KEY = '__duncitRequestCache';

type Store = Map<string, Map<string, unknown>>;

function bucket(carrier: CacheCarrier, name: string): Map<string, unknown> {
  const bag = carrier as Record<string, unknown>;
  const store = (bag[STORE_KEY] ??= new Map()) as Store;
  let found = store.get(name);
  if (!found) {
    found = new Map<string, unknown>();
    store.set(name, found);
  }
  return found;
}

/**
 * Read `ids` out of a per-request bucket, fetching only the ones not seen yet.
 *
 * `fetchMissing` receives just the unknown ids and returns what it found. An id
 * with no record is cached as `null` so a second ask for the same missing row
 * does not re-query — "we looked and there is nothing" is an answer worth
 * remembering for the length of one request.
 */
export async function loadMany<T>(
  carrier: CacheCarrier,
  name: string,
  ids: readonly string[],
  fetchMissing: (missing: string[]) => Promise<Map<string, T>>,
): Promise<Map<string, T>> {
  const cache = bucket(carrier, name);
  const wanted = Array.from(new Set(ids.filter(Boolean).map(String)));
  const missing = wanted.filter((id) => !cache.has(id));

  if (missing.length > 0) {
    const fetched = await fetchMissing(missing);
    for (const id of missing) cache.set(id, fetched.get(id) ?? null);
  }

  const out = new Map<string, T>();
  for (const id of wanted) {
    const value = cache.get(id);
    if (value !== null && value !== undefined) out.set(id, value as T);
  }
  return out;
}

/**
 * Prime the bucket for a whole page of rows, so the per-row field resolvers
 * that follow are pure cache hits. Failure is deliberately swallowed: priming
 * is an optimisation, and the field resolver behind it still fetches what it
 * needs. A prime that threw would fail the list query over a lookup that had
 * not been asked for yet.
 */
export async function primeMany<T>(
  carrier: CacheCarrier,
  name: string,
  ids: readonly string[],
  fetchMissing: (missing: string[]) => Promise<Map<string, T>>,
): Promise<void> {
  if (ids.length === 0) return;
  await loadMany(carrier, name, ids, fetchMissing).catch(() => undefined);
}

/** One id through the same cache — `Pod.club` and friends. */
export async function loadOne<T>(
  carrier: CacheCarrier,
  name: string,
  id: string | null | undefined,
  fetchMissing: (missing: string[]) => Promise<Map<string, T>>,
): Promise<T | null> {
  if (!id) return null;
  const found = await loadMany<T>(carrier, name, [String(id)], fetchMissing);
  return found.get(String(id)) ?? null;
}
