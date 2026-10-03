import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { godaddyDomain } from '@modules/platform/dns/godaddy.gateway';
import type { DnsSyncOutcome, DnsSyncResult } from '@modules/platform/dns/dns.staging';
import {
  cloudflareActivationCheck,
  cloudflareCreateRecord,
  cloudflareCreateZone,
  cloudflareDeleteRecord,
  cloudflareZone,
  type CloudflareConfig,
  type CloudflareZone,
} from './cloudflare.gateway';
import { toCloudflareRecord, type CloudflareCompareRow } from './cloudflare.compare';
import {
  connections,
  godaddyNameServers,
  liveProvider,
  nameServerSet,
  requireConnected,
  snapshot,
  snapshotWithZone,
} from './cloudflare.snapshot';

/**
 * Tech → Security → Cloudflare: moving the duncit.com zone from GoDaddy's
 * nameservers to Cloudflare's — the console version of Phase 0 in
 * infra/terraform/README.md.
 *
 * Writes only ever go ONTO Cloudflare (add the zone, copy a GoDaddy record,
 * remove a Cloudflare record). Nothing here edits a GoDaddy record; the only
 * GoDaddy write on this page is the nameserver switch, in
 * `cloudflare.nameservers.ts`.
 */

const toZone = (zone: Readonly<CloudflareZone>) => ({
  id: zone.id,
  status: zone.status,
  paused: zone.paused ?? false,
  name_servers: nameServerSet(zone.name_servers ?? []),
  activated_on: zone.activated_on ?? null,
});

/** A row as the schema carries it — the source record and Cloudflare id stay on the server. */
const toRow = ({ source: _source, cloudflare_id: _id, ...row }: Readonly<CloudflareCompareRow>) => row;

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : 'Cloudflare refused the write.');

/**
 * The rows a request names, refusing the whole call when one is not there any
 * more — "3 copied" must never hide that the fourth was a stale row.
 */
function selected(rows: readonly CloudflareCompareRow[], ids: readonly string[]): CloudflareCompareRow[] {
  const wanted = new Set(ids);
  const found = rows.filter((row) => wanted.has(row.id));
  if (found.length === wanted.size) return found;
  const missing = [...wanted].filter((id) => !found.some((row) => row.id === id));
  throw new GraphQLError(
    `These records changed since the list was read. Reload and try again: ${missing.join(', ')}`,
    { extensions: { code: 'NOT_FOUND' } }
  );
}

async function copyOne(cfg: Readonly<CloudflareConfig>, zoneId: string, row: Readonly<CloudflareCompareRow>): Promise<DnsSyncOutcome> {
  const outcome = { id: row.id, host: row.host };
  if (!row.copyable) {
    const message = row.state === 'GODADDY_ONLY' ? `${row.type} records are not copied.` : `${row.host} is already on Cloudflare.`;
    return { ...outcome, ok: false, message };
  }
  try {
    await cloudflareCreateRecord(cfg, zoneId, toCloudflareRecord(row));
    return { ...outcome, ok: true, message: null };
  } catch (error) {
    return { ...outcome, ok: false, message: reasonOf(error) };
  }
}

export const cloudflareService = {
  /** Both zones side by side and where the domain points today. Unconfigured is an answer, not an error. */
  async migration() {
    const { godaddy, cloudflare } = await connections();
    const base = {
      godaddy_configured: godaddy !== null,
      cloudflare_configured: cloudflare !== null,
      domain: godaddy?.domain ?? cloudflare?.domain ?? '',
      cloudflare_domain: cloudflare?.domain ?? '',
    };
    if (!godaddy || !cloudflare || godaddy.domain !== cloudflare.domain) {
      return {
        ...base,
        connected: false,
        zone: null,
        rows: [],
        matched: 0,
        godaddy_only: 0,
        cloudflare_only: 0,
        current_name_servers: [],
        godaddy_name_servers: [],
        live_provider: 'UNKNOWN',
        ready_to_switch: false,
      };
    }
    const [snap, info] = await Promise.all([snapshot({ godaddy, cloudflare }), godaddyDomain(godaddy)]);
    const current = info.nameServers ?? [];
    return {
      ...base,
      connected: true,
      zone: snap.zone ? toZone(snap.zone) : null,
      rows: snap.compare.rows.map(toRow),
      matched: snap.compare.matched,
      godaddy_only: snap.compare.godaddy_only,
      cloudflare_only: snap.compare.cloudflare_only,
      current_name_servers: nameServerSet(current),
      godaddy_name_servers: godaddyNameServers(snap.godaddyRecords),
      live_provider: liveProvider(current, snap.zone?.name_servers ?? []),
      ready_to_switch: snap.zone !== null && snap.compare.godaddy_only === 0,
    };
  },

  /** Add the domain to Cloudflare. Idempotent: a zone already there is left as it is. */
  async createZone(by: string) {
    const { cloudflare } = await requireConnected();
    if (await cloudflareZone(cloudflare)) return true;
    const zone = await cloudflareCreateZone(cloudflare);
    logs.server.info('cloudflare', 'zone-create', { domain: cloudflare.domain, zone_id: zone.id, by });
    return true;
  },

  /**
   * Copy the named GoDaddy-only records onto Cloudflare, DNS-only.
   *
   * Each record is written on its own: one refusal (a CNAME where Cloudflare
   * already holds another record, say) is reported against that row and the
   * rest still land.
   */
  async copy(ids: readonly string[], by: string): Promise<DnsSyncResult> {
    if (ids.length === 0) {
      throw new GraphQLError('Pick at least one record to copy.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const conn = await requireConnected();
    const snap = await snapshotWithZone(conn);
    const outcomes = await Promise.all(
      selected(snap.compare.rows, ids).map((row) => copyOne(conn.cloudflare, snap.zone.id, row))
    );
    const synced = outcomes.filter((outcome) => outcome.ok).length;
    logs.server.info('cloudflare', 'copy', { domain: conn.cloudflare.domain, synced, failed: outcomes.length - synced, by });
    return { synced, failed: outcomes.length - synced, outcomes };
  },

  /** Remove one record from Cloudflare. GoDaddy's copy, if it has one, is untouched. */
  async removeRecord(id: string, by: string) {
    const conn = await requireConnected();
    const snap = await snapshotWithZone(conn);
    const [row] = selected(snap.compare.rows, [id]);
    if (!row.cloudflare_id) {
      throw new GraphQLError(`${row.host} has no Cloudflare record to remove.`, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await cloudflareDeleteRecord(conn.cloudflare, snap.zone.id, row.cloudflare_id);
    logs.server.info('cloudflare', 'record-delete', { domain: conn.cloudflare.domain, type: row.type, name: row.name, by });
    return true;
  },

  /** Ask Cloudflare to re-check the nameservers now instead of on its own schedule. */
  async activationCheck(by: string) {
    const { cloudflare } = await requireConnected();
    const zone = await cloudflareZone(cloudflare);
    if (!zone) throw new GraphQLError(`${cloudflare.domain} is not on Cloudflare yet.`, { extensions: { code: 'BAD_REQUEST' } });
    await cloudflareActivationCheck(cloudflare, zone.id);
    logs.server.info('cloudflare', 'activation-check', { domain: cloudflare.domain, by });
    return true;
  },
};
