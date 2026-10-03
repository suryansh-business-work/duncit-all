import type { GodaddyRecord } from '@modules/platform/dns/godaddy.gateway';
import type { CloudflareRecord, CloudflareRecordData, CloudflareRecordInput } from './cloudflare.gateway';

/**
 * GoDaddy's zone beside Cloudflare's, record by record — what has to be true
 * before the nameservers can move without a single host going dark.
 *
 * Both sides are reduced to one comparable shape (relative name, normalised
 * value) because the two APIs spell the same record differently: Cloudflare
 * returns fully-qualified names, quotes TXT values and splits SRV/CAA into
 * fields, GoDaddy does none of that. Two records are "the same" when type,
 * name, value and priority agree — TTL is not compared, since Cloudflare
 * caps it lower than GoDaddy allows and a different cache time never breaks a
 * host.
 */

export type CloudflareRowState = 'BOTH' | 'GODADDY_ONLY' | 'CLOUDFLARE_ONLY';

/** The types a copy writes. SOA and the apex NS belong to whichever provider is live, so they never move. */
const COPYABLE = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA', 'SRV', 'NS']);
/** Types whose value is a hostname, so case and a trailing dot are not differences. */
const HOSTNAME_VALUED = new Set(['CNAME', 'MX', 'NS', 'SRV']);
/** Only these can sit behind Cloudflare's proxy; copies always go DNS-only, like the GoDaddy zone. */
const PROXIABLE = new Set(['A', 'AAAA', 'CNAME']);

/** Cloudflare's ceiling for a non-Enterprise TTL; GoDaddy allows up to a week. */
const CLOUDFLARE_MAX_TTL = 86_400;
const CLOUDFLARE_MIN_TTL = 60;
const COPY_COMMENT = 'Copied from GoDaddy by Tech → Security → Cloudflare';

export interface CloudflareCompareRow {
  /** type|name|value|priority — unique on both sides, since neither provider stores a duplicate. */
  id: string;
  type: string;
  name: string;
  host: string;
  priority: number | null;
  godaddy_value: string | null;
  cloudflare_value: string | null;
  /** Null when Cloudflare has no record here. */
  proxied: boolean | null;
  state: CloudflareRowState;
  /** Whether copying to Cloudflare can fix it — a GoDaddy-only record of a type this console writes. */
  copyable: boolean;
  /** Internal: the source record a copy sends, and the Cloudflare id a delete targets. Not in the schema. */
  source: GodaddyRecord | null;
  cloudflare_id: string | null;
}

export interface CloudflareCompare {
  rows: CloudflareCompareRow[];
  matched: number;
  godaddy_only: number;
  cloudflare_only: number;
}

const stripDot = (value: string) => value.replace(/\.$/, '');
const underscored = (label: string) => (label.startsWith('_') ? label : `_${label}`);

/** `"a" "b"` → `ab`: Cloudflare quotes TXT values and splits long ones; GoDaddy stores them bare. */
function unquoteTxt(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed;
  return [...trimmed.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]).join('');
}

/** The value two records are compared on. */
function normalise(type: string, value: string): string {
  if (type === 'TXT') return unquoteTxt(value);
  if (type === 'CAA') return value.replaceAll('"', '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (HOSTNAME_VALUED.has(type)) return stripDot(value.trim().toLowerCase());
  return value.trim().toLowerCase();
}

/** GoDaddy keeps an SRV's service and protocol beside its name; Cloudflare folds them into it. */
function godaddyName(record: Readonly<GodaddyRecord>): string {
  const name = record.name.toLowerCase();
  if (record.type !== 'SRV') return name;
  const labels = [underscored(record.service ?? ''), underscored(record.protocol ?? '')];
  return [...labels, ...(name === '@' ? [] : [name])].join('.').toLowerCase();
}

/** GoDaddy writes a CNAME to the apex as `@`; Cloudflare, like the rest of DNS, as the domain. */
function godaddyValue(record: Readonly<GodaddyRecord>, domain: string): string {
  if (record.type === 'SRV') return `${record.weight ?? 0} ${record.port ?? 0} ${record.data}`;
  return record.type === 'CNAME' && record.data === '@' ? domain : record.data;
}

/** A Cloudflare name relative to the zone, the way GoDaddy writes it. */
function relativeName(fqdn: string, domain: string): string {
  const name = stripDot(fqdn.toLowerCase());
  if (name === domain) return '@';
  return name.endsWith(`.${domain}`) ? name.slice(0, -(domain.length + 1)) : name;
}

/** Cloudflare's structured SRV/CAA data, rendered the way GoDaddy writes the same record. */
function cloudflareValue(record: Readonly<CloudflareRecord>): string {
  const data = record.data ?? {};
  if (record.type === 'SRV' && data.target !== undefined) return `${data.weight ?? 0} ${data.port ?? 0} ${data.target}`;
  if (record.type === 'CAA' && data.tag !== undefined) return `${data.flags ?? 0} ${data.tag} "${data.value ?? ''}"`;
  return record.content;
}

const cloudflarePriority = (record: Readonly<CloudflareRecord>): number | null => {
  const fromData = record.data?.priority;
  if (typeof fromData === 'number') return fromData;
  return record.type === 'MX' || record.type === 'SRV' ? record.priority ?? null : null;
};

/** SOA and the apex NS are each provider's own, and say nothing about whether a host survives the move. */
const isProviderOwned = (type: string, name: string) => type === 'SOA' || (type === 'NS' && name === '@');

const rowKey = (type: string, name: string, value: string, priority: number | null) =>
  `${type}|${name}|${normalise(type, value)}|${priority ?? ''}`;

const hostOf = (name: string, domain: string) => (name === '@' ? domain : `${name}.${domain}`);

/** Pair the two zones. Rows come back sorted by host, then type, so one host's records sit together. */
export function compareZones(
  godaddy: readonly GodaddyRecord[],
  cloudflare: readonly CloudflareRecord[],
  domain: string
): CloudflareCompare {
  const rows = new Map<string, CloudflareCompareRow>();
  const blank = (type: string, name: string, priority: number | null, id: string): CloudflareCompareRow => ({
    id,
    type,
    name,
    host: hostOf(name, domain),
    priority,
    godaddy_value: null,
    cloudflare_value: null,
    proxied: null,
    state: 'GODADDY_ONLY',
    copyable: false,
    source: null,
    cloudflare_id: null,
  });

  for (const record of godaddy) {
    const name = godaddyName(record);
    if (isProviderOwned(record.type, name)) continue;
    const priority = record.type === 'MX' || record.type === 'SRV' ? record.priority ?? null : null;
    const value = godaddyValue(record, domain);
    const id = rowKey(record.type, name, value, priority);
    rows.set(id, { ...blank(record.type, name, priority, id), godaddy_value: value, source: record });
  }

  for (const record of cloudflare) {
    const name = relativeName(record.name, domain);
    if (isProviderOwned(record.type, name)) continue;
    const priority = cloudflarePriority(record);
    const value = cloudflareValue(record);
    const id = rowKey(record.type, name, value, priority);
    const row = rows.get(id) ?? blank(record.type, name, priority, id);
    rows.set(id, {
      ...row,
      cloudflare_value: value,
      proxied: record.proxied ?? false,
      cloudflare_id: record.id,
    });
  }

  const list = [...rows.values()].map((row) => {
    let state: CloudflareRowState = 'BOTH';
    if (row.cloudflare_id === null) state = 'GODADDY_ONLY';
    else if (row.source === null) state = 'CLOUDFLARE_ONLY';
    return { ...row, state, copyable: state === 'GODADDY_ONLY' && COPYABLE.has(row.type) };
  });
  list.sort((a, b) => a.host.localeCompare(b.host) || a.type.localeCompare(b.type));

  return {
    rows: list,
    matched: list.filter((row) => row.state === 'BOTH').length,
    godaddy_only: list.filter((row) => row.state === 'GODADDY_ONLY').length,
    cloudflare_only: list.filter((row) => row.state === 'CLOUDFLARE_ONLY').length,
  };
}

/** `0 issue "letsencrypt.org"` → Cloudflare's CAA fields. */
function caaData(value: string): CloudflareRecordData {
  const [flags, tag, ...rest] = value.trim().split(/\s+/);
  if (!/^\d+$/.test(flags) || !tag || rest.length === 0) throw new Error(`The CAA value "${value}" is not "flags tag value".`);
  return { flags: Number(flags), tag, value: rest.join(' ').replaceAll('"', '') };
}

/** The Cloudflare record a GoDaddy one becomes. DNS-only, so the move changes no path any traffic takes. */
export function toCloudflareRecord(row: Readonly<CloudflareCompareRow>): CloudflareRecordInput {
  const source = row.source;
  if (!source) throw new Error(`${row.host} has no GoDaddy record to copy.`);
  const base = {
    type: source.type,
    name: row.host,
    ttl: Math.min(Math.max(source.ttl, CLOUDFLARE_MIN_TTL), CLOUDFLARE_MAX_TTL),
    comment: COPY_COMMENT,
    ...(PROXIABLE.has(source.type) ? { proxied: false } : {}),
  };
  if (source.type === 'CAA') return { ...base, data: caaData(source.data) };
  if (source.type === 'SRV') {
    return {
      ...base,
      data: { priority: source.priority ?? 0, weight: source.weight ?? 0, port: source.port ?? 0, target: stripDot(source.data) },
    };
  }
  if (source.type === 'MX') return { ...base, content: source.data, priority: source.priority ?? 0 };
  return { ...base, content: row.godaddy_value ?? source.data };
}
