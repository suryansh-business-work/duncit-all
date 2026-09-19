import type { GodaddyRecord } from './godaddy.gateway';

/**
 * Staging lives in the SAME zone as production, one label deeper:
 * `admin.duncit.com` is answered by `admin`, and its staging replica by
 * `staging.admin`. The apex pair is `@` and `staging`.
 *
 * That convention is the whole reason this file exists. Nothing in DNS ties
 * the two names together, so a portal added to production and forgotten on
 * staging resolves nowhere and is only found when somebody opens the staging
 * URL — which is exactly when a release is being verified.
 */
const STAGING_APEX = 'staging';
const STAGING_PREFIX = 'staging.';
const APEX = '@';

/**
 * The types that name a HOST, and so have a staging twin at all. A TXT
 * verification token or an MX route belongs to the domain, not to one replica
 * of it, and flagging `staging._dmarc` as missing would be noise.
 */
export const PAIRED_TYPES = ['A', 'AAAA', 'CNAME'];
const PAIRED = new Set(PAIRED_TYPES);

export type DnsScope = 'PRODUCTION' | 'STAGING';

/** Which stack a record answers for, read off its name. */
export function scopeOf(name: string): DnsScope {
  if (name === STAGING_APEX || name.startsWith(STAGING_PREFIX)) return 'STAGING';
  return 'PRODUCTION';
}

/** The production name a staging record is the twin of. */
const productionNameOf = (name: string): string =>
  name === STAGING_APEX ? APEX : name.slice(STAGING_PREFIX.length);

/** The staging name a production record should have. */
export const stagingNameOf = (name: string): string =>
  name === APEX ? STAGING_APEX : `${STAGING_PREFIX}${name}`;

/** The full host a relative name answers for. */
export const hostOf = (name: string, domain: string): string => (name === APEX ? domain : `${name}.${domain}`);

/**
 * A wildcard already answers for every host under it, staging included, so it
 * has no twin to be missing. Pairing `*` with `staging.*` would report a gap
 * that is not one.
 */
const isWildcard = (name: string) => name.includes('*');

export type DnsPairState = 'MATCHED' | 'MISSING_STAGING' | 'MISSING_PRODUCTION' | 'VALUE_DIFFERS';

export interface DnsHostPair {
  id: string;
  type: string;
  name: string;
  host: string;
  staging_name: string;
  staging_host: string;
  production_values: string[];
  staging_values: string[];
  ttl: number | null;
  state: DnsPairState;
  fixable: boolean;
}

export interface DnsTypeGroup {
  type: string;
  total: number;
  production: number;
  staging: number;
}

/** Sorted so two sets holding the same values in a different order still match. */
const valuesOf = (records: readonly GodaddyRecord[]): string[] => records.map((r) => r.data).toSorted((a, b) => a.localeCompare(b));

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

/** Every record type in the zone with how many of it each stack holds. */
export function typeGroups(records: readonly GodaddyRecord[]): DnsTypeGroup[] {
  const groups = new Map<string, DnsTypeGroup>();
  for (const record of records) {
    const group = groups.get(record.type) ?? { type: record.type, total: 0, production: 0, staging: 0 };
    group.total += 1;
    if (scopeOf(record.name) === 'STAGING') group.staging += 1;
    else group.production += 1;
    groups.set(record.type, group);
  }
  return [...groups.values()].toSorted((a, b) => a.type.localeCompare(b.type));
}

/** The production name a record is filed under, whichever stack it belongs to. */
const baseNameOf = (record: Readonly<GodaddyRecord>): string =>
  scopeOf(record.name) === 'STAGING' ? productionNameOf(record.name) : record.name;

function stateOf(production: readonly string[], staging: readonly string[]): DnsPairState {
  if (production.length === 0) return 'MISSING_PRODUCTION';
  if (staging.length === 0) return 'MISSING_STAGING';
  return same(production, staging) ? 'MATCHED' : 'VALUE_DIFFERS';
}

/** Both sides of one (type, host) pair, ready to compare. */
interface PairBucket {
  type: string;
  name: string;
  production: GodaddyRecord[];
  staging: GodaddyRecord[];
}

function bucketPairs(records: readonly GodaddyRecord[]): Map<string, PairBucket> {
  const buckets = new Map<string, PairBucket>();
  for (const record of records) {
    if (!PAIRED.has(record.type) || isWildcard(record.name)) continue;
    const name = baseNameOf(record);
    const key = `${record.type}|${name}`;
    const bucket = buckets.get(key) ?? { type: record.type, name, production: [], staging: [] };
    if (scopeOf(record.name) === 'STAGING') bucket.staging.push(record);
    else bucket.production.push(record);
    buckets.set(key, bucket);
  }
  return buckets;
}

/**
 * Every host that either stack answers for, with what the other one holds.
 *
 * A pair is keyed on the PRODUCTION name, so a staging record whose production
 * twin was removed still shows up — as `MISSING_PRODUCTION`, which is a
 * different mistake from a portal that never reached staging.
 */
export function hostPairs(records: readonly GodaddyRecord[], domain: string): DnsHostPair[] {
  const rows = [...bucketPairs(records).values()].map((bucket) => {
    const production = valuesOf(bucket.production);
    const staging = valuesOf(bucket.staging);
    const stagingName = stagingNameOf(bucket.name);
    return {
      id: `${bucket.type}|${bucket.name}`,
      type: bucket.type,
      name: bucket.name,
      host: hostOf(bucket.name, domain),
      staging_name: stagingName,
      staging_host: hostOf(stagingName, domain),
      production_values: production,
      staging_values: staging,
      ttl: bucket.production[0]?.ttl ?? null,
      state: stateOf(production, staging),
      // Sync copies production onto staging. With no production side there is
      // nothing to copy, and inventing one is not this console's call.
      fixable: production.length > 0,
    };
  });
  return rows.toSorted((a, b) => a.host.localeCompare(b.host) || a.type.localeCompare(b.type));
}

export interface DnsStagingCompare {
  production_count: number;
  staging_count: number;
  matched: number;
  missing_staging: number;
  missing_production: number;
  differs: number;
  in_sync: boolean;
  paired_types: string[];
  pairs: DnsHostPair[];
}

const countOf = (pairs: readonly DnsHostPair[], state: DnsPairState) => pairs.filter((p) => p.state === state).length;

/** The staging-versus-production picture the console's summary tiles read. */
export function stagingCompare(records: readonly GodaddyRecord[], domain: string): DnsStagingCompare {
  const pairs = hostPairs(records, domain);
  const missing_staging = countOf(pairs, 'MISSING_STAGING');
  const missing_production = countOf(pairs, 'MISSING_PRODUCTION');
  const differs = countOf(pairs, 'VALUE_DIFFERS');
  return {
    production_count: pairs.reduce((sum, pair) => sum + pair.production_values.length, 0),
    staging_count: pairs.reduce((sum, pair) => sum + pair.staging_values.length, 0),
    matched: countOf(pairs, 'MATCHED'),
    missing_staging,
    missing_production,
    differs,
    in_sync: missing_staging === 0 && missing_production === 0 && differs === 0,
    paired_types: PAIRED_TYPES,
    pairs,
  };
}
