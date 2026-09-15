/**
 * Real ids for the detail journeys — which pod, club, venue, person or policy a
 * bot opens next.
 *
 * Loaded ONCE per shard, before the first bot starts, with one anonymous query
 * of the same public lists mWeb's own pages read. A bot then picks a random
 * entry per walk, so the server resolves many different records instead of
 * answering one id from cache for the whole run.
 */
import { graphqlHeaders } from './http-bots.mjs';

const SEEDS = `query StressSeeds {
  pods(filter: { is_active: true }) { id pod_id club_slug pod_hosts_id pod_attendees }
  clubs(filter: { is_active: true }) { id club_id }
  publicVenues { id }
  publicHosts { user_id }
  publicPolicies { slug }
}`;

/** Enough variety to defeat a per-id cache; bounded so a big catalogue is not held in memory. */
const MAX_PER_POOL = 200;

export const seeds = { pods: [], clubs: [], venues: [], hosts: [], policies: [] };

const sample = (rows) => (rows ?? []).slice(0, MAX_PER_POOL);

export async function loadSeeds(ctx) {
  const res = await fetch(ctx.graphqlUrl, {
    method: 'POST',
    headers: graphqlHeaders(ctx),
    body: JSON.stringify({ operationName: 'StressSeeds', query: SEEDS }),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    const reason = json?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Could not load the ids the detail journeys walk: ${reason}`);
  }
  const { data } = json;
  seeds.pods = sample(data.pods?.filter((p) => p.club_slug));
  seeds.clubs = sample(data.clubs);
  seeds.venues = sample(data.publicVenues);
  seeds.hosts = sample(data.publicHosts);
  seeds.policies = sample(data.publicPolicies);
}

/** A random entry of the named pool, or null when the pool is empty. */
export function pickFrom(pool) {
  const rows = seeds[pool] ?? [];
  return rows.length === 0 ? null : rows[Math.floor(Math.random() * rows.length)];
}
