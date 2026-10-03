import { GraphQLError } from 'graphql';
import {
  godaddyConfig,
  godaddyRecords,
  requireGodaddyConfig,
  type GodaddyConfig,
  type GodaddyRecord,
} from '@modules/platform/dns/godaddy.gateway';
import {
  cloudflareConfig,
  cloudflareRecords,
  cloudflareZone,
  requireCloudflareConfig,
  type CloudflareConfig,
  type CloudflareZone,
} from './cloudflare.gateway';
import { compareZones, type CloudflareCompare } from './cloudflare.compare';

/**
 * Both providers read together, and the comparison derived from them.
 *
 * Every write on this console re-reads through here first, so it acts on what
 * GoDaddy and Cloudflare hold NOW — not on whatever the browser loaded before
 * somebody else changed a record.
 */

/** Where GoDaddy's own nameservers live. */
const GODADDY_NS_SUFFIX = '.domaincontrol.com';

export type LiveProvider = 'CLOUDFLARE' | 'GODADDY' | 'OTHER' | 'UNKNOWN';

export interface Connected {
  godaddy: GodaddyConfig;
  cloudflare: CloudflareConfig;
}

export interface Snapshot {
  zone: CloudflareZone | null;
  godaddyRecords: GodaddyRecord[];
  compare: CloudflareCompare;
}

const badRequest = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_REQUEST' } });

/** Lowercase, no trailing dot, de-duplicated and sorted — so two lists of the same servers compare equal. */
export const nameServerSet = (list: readonly string[]): string[] =>
  [...new Set(list.map((ns) => ns.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

/** Which provider the registrar sends resolvers to today. */
export function liveProvider(current: readonly string[], cloudflare: readonly string[]): LiveProvider {
  const now = nameServerSet(current);
  if (now.length === 0) return 'UNKNOWN';
  const assigned = nameServerSet(cloudflare);
  if (assigned.length > 0 && now.join(',') === assigned.join(',')) return 'CLOUDFLARE';
  if (now.every((ns) => ns.endsWith(GODADDY_NS_SUFFIX))) return 'GODADDY';
  return 'OTHER';
}

/**
 * GoDaddy's own nameservers for this domain — the NS set at `@` its zone keeps
 * holding even while the domain points elsewhere. It is what "switch back to
 * GoDaddy" restores, read live rather than stored, so it can never go stale.
 */
export const godaddyNameServers = (records: readonly GodaddyRecord[]): string[] =>
  nameServerSet(records.filter((record) => record.type === 'NS' && record.name === '@').map((record) => record.data));

/** Both configs as they stand, either one null when it is not filled in. */
export async function connections(): Promise<{ godaddy: GodaddyConfig | null; cloudflare: CloudflareConfig | null }> {
  const [godaddy, cloudflare] = await Promise.all([godaddyConfig(), cloudflareConfig()]);
  return { godaddy, cloudflare };
}

/** Both configs, refusing when either is missing or they name different domains. */
export async function requireConnected(): Promise<Connected> {
  const [godaddy, cloudflare] = await Promise.all([requireGodaddyConfig(), requireCloudflareConfig()]);
  if (godaddy.domain !== cloudflare.domain) {
    throw badRequest(
      `GoDaddy manages ${godaddy.domain} but Cloudflare is set to ${cloudflare.domain}. Make the two domains match in Tech → Environment Variables.`
    );
  }
  return { godaddy, cloudflare };
}

/** GoDaddy's records and Cloudflare's zone in parallel, then Cloudflare's records once the zone id is known. */
export async function snapshot(conn: Readonly<Connected>): Promise<Snapshot> {
  const [records, zone] = await Promise.all([godaddyRecords(conn.godaddy), cloudflareZone(conn.cloudflare)]);
  const cloudflare = zone ? await cloudflareRecords(conn.cloudflare, zone.id) : [];
  return { zone, godaddyRecords: records, compare: compareZones(records, cloudflare, conn.godaddy.domain) };
}

/** A snapshot whose Cloudflare zone exists, or a refusal saying to add it first. */
export async function snapshotWithZone(conn: Readonly<Connected>): Promise<Snapshot & { zone: CloudflareZone }> {
  const snap = await snapshot(conn);
  const { zone } = snap;
  if (!zone) throw badRequest(`${conn.cloudflare.domain} is not on Cloudflare yet. Add the zone first.`);
  return { ...snap, zone };
}
