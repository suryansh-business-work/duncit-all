import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { hostPairs, type DnsHostPair } from './dns.compare';
import {
  godaddyRecords,
  godaddyReplaceSet,
  requireGodaddyConfig,
  type GodaddyConfig,
  type GodaddySetRecord,
} from './godaddy.gateway';

/**
 * Making staging answer for the same hosts production does.
 *
 * Sync only ever copies production ONTO staging — never the other way, and
 * never a delete. Staging is the replica; production is the thing being
 * replicated, and a console that could push a staging value onto a live host
 * is one misclick away from taking duncit.com down.
 */

/** A TTL GoDaddy will take, whatever the production record carries. */
const FALLBACK_TTL = 600;

export interface DnsSyncOutcome {
  id: string;
  host: string;
  ok: boolean;
  message: string | null;
}

export interface DnsSyncResult {
  synced: number;
  failed: number;
  outcomes: DnsSyncOutcome[];
}

/** The staging set a pair should end up with: exactly production's values. */
const stagingSet = (pair: Readonly<DnsHostPair>): GodaddySetRecord[] =>
  pair.production_values.map((data) => ({ data, ttl: pair.ttl ?? FALLBACK_TTL }));

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'GoDaddy refused the write.';

/**
 * The pairs a request names, refusing the whole call when an id is not one.
 *
 * A partially-applied sync is worse than a refused one: the operator reads
 * "3 synced" and never learns the fourth host was a typo.
 */
function selected(pairs: readonly DnsHostPair[], ids: readonly string[]): DnsHostPair[] {
  const wanted = new Set(ids);
  const found = pairs.filter((pair) => wanted.has(pair.id));
  if (found.length === wanted.size) return found;
  const missing = [...wanted].filter((id) => !found.some((pair) => pair.id === id));
  throw new GraphQLError(
    `These hosts are no longer in the zone — it changed since the list was read. Reload and try again: ${missing.join(', ')}`,
    { extensions: { code: 'NOT_FOUND' } }
  );
}

/** One pair written onto staging, with GoDaddy's own reason when it refuses. */
async function syncOne(cfg: Readonly<GodaddyConfig>, pair: Readonly<DnsHostPair>): Promise<DnsSyncOutcome> {
  const outcome = { id: pair.id, host: pair.staging_host };
  if (!pair.fixable) {
    return { ...outcome, ok: false, message: `${pair.host} has no ${pair.type} record to copy from.` };
  }
  try {
    await godaddyReplaceSet(cfg, pair.type, pair.staging_name, stagingSet(pair));
    return { ...outcome, ok: true, message: null };
  } catch (error) {
    return { ...outcome, ok: false, message: reasonOf(error) };
  }
}

export const dnsStagingService = {
  /**
   * Point the named staging hosts at whatever production currently holds.
   *
   * The zone is re-read first, so a record changed at GoDaddy since the page
   * loaded is the one that gets copied — not the value the browser is showing.
   * Each host is written on its own: one refusal (a CNAME GoDaddy will not put
   * at that name, say) is reported against that host and the rest still land.
   */
  async sync(ids: readonly string[], by: string): Promise<DnsSyncResult> {
    if (ids.length === 0) {
      throw new GraphQLError('Pick at least one host to sync.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const cfg = await requireGodaddyConfig();
    const pairs = hostPairs(await godaddyRecords(cfg), cfg.domain);
    const outcomes: DnsSyncOutcome[] = [];
    for (const pair of selected(pairs, ids)) {
      outcomes.push(await syncOne(cfg, pair));
    }
    const synced = outcomes.filter((outcome) => outcome.ok).length;
    logs.server.info('dns', 'staging-sync', { domain: cfg.domain, synced, failed: outcomes.length - synced, by });
    return { synced, failed: outcomes.length - synced, outcomes };
  },
};
