import { isIPv4, isIPv6 } from 'node:net';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import {
  godaddyAddRecords,
  godaddyConfig,
  godaddyDeleteSet,
  godaddyRecords,
  godaddyRecordSet,
  godaddyReplaceSet,
  requireGodaddyConfig,
  type GodaddyConfig,
  type GodaddyRecord,
  type GodaddySetRecord,
} from './godaddy.gateway';

/**
 * The record types this console writes. NS and SOA stay read-only because
 * they belong to the nameservers — one wrong NS at `@` takes every host in the
 * zone offline — and SRV needs service/protocol/port fields the editor does
 * not carry. All of them are still LISTED.
 */
const WRITABLE_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA'];
const WRITABLE = new Set(WRITABLE_TYPES);

/** GoDaddy's own TTL bounds, in seconds. */
const MIN_TTL = 600;
const MAX_TTL = 604_800;
const MAX_PRIORITY = 65_535;

/** `@`, `*`, or dot-separated labels (letters, digits, `-`, `_`), optionally under a `*.` wildcard. */
const NAME_RE = /^(?:@|\*|(?:\*\.)?[\w-]+(?:\.[\w-]+)*)$/;

export interface DnsRecordInput {
  type: string;
  name: string;
  data: string;
  ttl: number;
  priority?: number | null;
}

/** Which record a change is about. GoDaddy has no id, so the listing's own values are the address. */
export interface DnsRecordRef {
  type: string;
  name: string;
  data: string;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** Normalised (type, name) of a ref, refused when this console does not write that type. */
function writableRef(ref: Readonly<DnsRecordRef>): DnsRecordRef {
  const type = ref.type.trim().toUpperCase();
  if (!WRITABLE.has(type)) {
    throw badInput(`${type} records are read-only here. This console writes ${WRITABLE_TYPES.join(', ')} records.`);
  }
  return { type, name: ref.name.trim().toLowerCase(), data: ref.data };
}

function checkName(name: string, domain: string) {
  if (name === domain || name.endsWith(`.${domain}`)) {
    throw badInput(`Enter the name relative to ${domain}: "shop" for shop.${domain}, "@" for ${domain} itself.`);
  }
  if (!NAME_RE.test(name)) {
    throw badInput('A name is "@", or labels of letters, digits, "-" and "_" separated by dots.');
  }
}

function checkData(type: string, data: string) {
  if (!data) throw badInput('The value is required.');
  if (type === 'A' && !isIPv4(data)) throw badInput('An A record points at an IPv4 address, e.g. 203.0.113.10.');
  if (type === 'AAAA' && !isIPv6(data)) throw badInput('An AAAA record points at an IPv6 address.');
}

const isWhole = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** The record GoDaddy will be sent, or a refusal naming the field to fix. */
function toRecord(input: Readonly<DnsRecordInput>, domain: string): GodaddyRecord {
  const { type, name } = writableRef(input);
  const data = input.data.trim();
  checkName(name, domain);
  checkData(type, data);
  if (!isWhole(input.ttl, MIN_TTL, MAX_TTL)) {
    throw badInput(`TTL is whole seconds between ${MIN_TTL} and ${MAX_TTL}.`);
  }
  if (type !== 'MX') return { type, name, data, ttl: input.ttl };
  if (!isWhole(input.priority, 0, MAX_PRIORITY)) {
    throw badInput(`An MX record needs a priority between 0 and ${MAX_PRIORITY}.`);
  }
  return { type, name, data, ttl: input.ttl, priority: input.priority };
}

/** The set a ref lives in, and where in it. Refused when the record is no longer there. */
async function locate(cfg: Readonly<GodaddyConfig>, ref: Readonly<DnsRecordRef>) {
  const set = await godaddyRecordSet(cfg, ref.type, ref.name);
  const index = set.findIndex((record) => record.data === ref.data);
  if (index < 0) {
    throw new GraphQLError('That record is no longer in the zone — it was changed or removed elsewhere. Reload the list.', {
      extensions: { code: 'NOT_FOUND' },
    });
  }
  return { set, index };
}

/** A record as its set holds it — GoDaddy takes the type and name from the path. */
const inSet = (record: Readonly<GodaddyRecord>): GodaddySetRecord => ({
  data: record.data,
  ttl: record.ttl,
  priority: record.priority,
});

const toRow = (record: Readonly<GodaddyRecord>) => ({
  // Unique within a zone: GoDaddy refuses two records with the same type, name and value.
  id: `${record.type}|${record.name}|${record.data}`,
  type: record.type,
  name: record.name,
  data: record.data,
  ttl: record.ttl,
  priority: record.priority ?? null,
  editable: WRITABLE.has(record.type),
});

export const dnsService = {
  /** The zone and the rules its editor follows. Unconfigured is an answer, not an error. */
  async zone() {
    const rules = { writable_types: WRITABLE_TYPES, min_ttl: MIN_TTL, max_ttl: MAX_TTL };
    const cfg = await godaddyConfig();
    if (!cfg) return { configured: false, domain: '', records: [], ...rules };
    const records = await godaddyRecords(cfg);
    return { configured: true, domain: cfg.domain, records: records.map(toRow), ...rules };
  },

  async add(input: Readonly<DnsRecordInput>, by: string) {
    const cfg = await requireGodaddyConfig();
    const record = toRecord(input, cfg.domain);
    await godaddyAddRecords(cfg, [record]);
    logs.server.info('dns', 'add', { domain: cfg.domain, type: record.type, name: record.name, by });
    return true;
  },

  /** Type and name are the record's address, so an edit keeps both. */
  async update(ref: Readonly<DnsRecordRef>, input: Readonly<DnsRecordInput>, by: string) {
    const cfg = await requireGodaddyConfig();
    const target = writableRef(ref);
    const record = toRecord(input, cfg.domain);
    if (record.type !== target.type || record.name !== target.name) {
      throw badInput('An edit keeps the type and name. To change either, add the new record and delete this one.');
    }
    const { set, index } = await locate(cfg, target);
    const next = set.map((current, i) => (i === index ? inSet(record) : current));
    await godaddyReplaceSet(cfg, target.type, target.name, next);
    logs.server.info('dns', 'update', { domain: cfg.domain, type: target.type, name: target.name, by });
    return true;
  },

  /** The last record of a set deletes the set; otherwise the set is written back without it. */
  async remove(ref: Readonly<DnsRecordRef>, by: string) {
    const cfg = await requireGodaddyConfig();
    const target = writableRef(ref);
    const { set, index } = await locate(cfg, target);
    const rest = set.filter((_, i) => i !== index);
    if (rest.length > 0) await godaddyReplaceSet(cfg, target.type, target.name, rest);
    else await godaddyDeleteSet(cfg, target.type, target.name);
    logs.server.info('dns', 'delete', { domain: cfg.domain, type: target.type, name: target.name, by });
    return true;
  },
};
