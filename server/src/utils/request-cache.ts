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

type Fetcher<T> = (missing: string[]) => Promise<Map<string, T>>;

/** The ids asked for during one tick, fetched together. */
interface Batch {
  ids: string[];
  done: Promise<void>;
}

interface Bucket {
  /** id → record, or null for "looked, nothing there". */
  values: Map<string, unknown>;
  /** id → the batch already fetching it. */
  inflight: Map<string, Promise<void>>;
  /** The batch still collecting ids this tick, if any. */
  open: Batch | null;
}

type Store = Map<string, Bucket>;

function bucket(carrier: CacheCarrier, name: string): Bucket {
  const bag = carrier as Record<string, unknown>;
  bag[STORE_KEY] ??= new Map();
  const store = bag[STORE_KEY] as Store;
  let found = store.get(name);
  if (!found) {
    found = { values: new Map(), inflight: new Map(), open: null };
    store.set(name, found);
  }
  return found;
}

/**
 * Queue `id` on the bucket's open batch, opening one if there is none.
 *
 * GraphQL calls a list's field resolvers one row after another in the same
 * tick, each asking for one id. The batch waits until that pass is over —
 * after the current promise jobs, like DataLoader — and then fetches every id
 * it collected in ONE call. Without it, rows nobody primed each saw their id
 * missing and each issued its own query: the N+1 this file exists to stop.
 *
 * A bucket name always pairs with one fetcher, so the batch uses the fetcher of
 * whichever caller opened it.
 */
function enqueue<T>(cache: Bucket, id: string, fetchMissing: Fetcher<T>): Promise<void> {
  if (!cache.open) {
    const batch: Batch = { ids: [], done: Promise.resolve() };
    batch.done = new Promise<void>((resolve) => {
      Promise.resolve().then(() => process.nextTick(resolve));
    })
      .then(() => {
        cache.open = null;
        return fetchMissing(batch.ids);
      })
      .then((fetched) => {
        for (const key of batch.ids) cache.values.set(key, fetched.get(key) ?? null);
      })
      .finally(() => {
        // A failed fetch caches nothing, so the next ask tries again.
        for (const key of batch.ids) cache.inflight.delete(key);
      });
    cache.open = batch;
  }
  cache.open.ids.push(id);
  cache.inflight.set(id, cache.open.done);
  return cache.open.done;
}

/**
 * Read `ids` out of a per-request bucket, fetching only the ones not seen yet.
 *
 * `fetchMissing` receives just the unknown ids and returns what it found. An id
 * with no record is cached as `null` so a second ask for the same missing row
 * does not re-query — "we looked and there is nothing" is an answer worth
 * remembering for the length of one request. Ids asked for by sibling
 * resolvers in the same tick share one fetch (see enqueue).
 */
export async function loadMany<T>(
  carrier: CacheCarrier,
  name: string,
  ids: readonly string[],
  fetchMissing: Fetcher<T>,
): Promise<Map<string, T>> {
  const cache = bucket(carrier, name);
  const wanted = Array.from(new Set(ids.filter(Boolean).map(String)));
  const waits = wanted
    .filter((id) => !cache.values.has(id))
    .map((id) => cache.inflight.get(id) ?? enqueue(cache, id, fetchMissing));
  await Promise.all(waits);

  const out = new Map<string, T>();
  for (const id of wanted) {
    const value = cache.values.get(id);
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
  fetchMissing: Fetcher<T>,
): Promise<void> {
  if (ids.length === 0) return;
  await loadMany(carrier, name, ids, fetchMissing).catch(() => undefined);
}

/** One id through the same cache — `Pod.club` and friends. */
export async function loadOne<T>(
  carrier: CacheCarrier,
  name: string,
  id: string | null | undefined,
  fetchMissing: Fetcher<T>,
): Promise<T | null> {
  if (!id) return null;
  const found = await loadMany<T>(carrier, name, [String(id)], fetchMissing);
  return found.get(String(id)) ?? null;
}
