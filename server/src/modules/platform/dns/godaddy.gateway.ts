import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * GoDaddy's Domains API — the only file in the server that knows GoDaddy's
 * URLs, auth header and error shapes.
 *
 * GoDaddy has no per-record id. A record is addressed by its (type, name)
 * SET: every A record called `shop` is one set, and changing or removing one
 * of them means writing the set back without it. The service does that
 * read-modify-write; this file only speaks the wire.
 *
 * The key is owned by the Tech portal (GoDaddy env category), never `.env`,
 * and is read fresh per call so a rotated key applies without a restart.
 */
const BASE_URL = 'https://api.godaddy.com/v1/domains';

/** No GoDaddy call gets longer than this to answer. */
const TIMEOUT_MS = 15_000;

export interface GodaddyConfig {
  apiKey: string;
  apiSecret: string;
  domain: string;
}

/** One record as GoDaddy stores it. SRV's extra fields ride along untouched. */
export interface GodaddyRecord {
  type: string;
  name: string;
  data: string;
  ttl: number;
  priority?: number;
  port?: number;
  weight?: number;
  service?: string;
  protocol?: string;
}

/** A record inside its (type, name) set — the shape GoDaddy's set PUT takes. */
export type GodaddySetRecord = Omit<GodaddyRecord, 'type' | 'name'>;

/** One party on the domain's registrar record, as GoDaddy returns it. */
export interface GodaddyContact {
  nameFirst?: string;
  nameLast?: string;
  organization?: string;
  email?: string;
  phone?: string;
}

/**
 * The domain itself, as GoDaddy's registrar holds it — everything that decides
 * whether the name keeps resolving next year, none of which any record in the
 * zone says.
 */
export interface GodaddyDomain {
  domainId?: number;
  domain: string;
  status: string;
  expires?: string;
  createdAt?: string;
  renewAuto?: boolean;
  renewDeadline?: string;
  renewable?: boolean;
  locked?: boolean;
  privacy?: boolean;
  transferProtected?: boolean;
  expirationProtected?: boolean;
  holdRegistrar?: boolean;
  nameServers?: string[];
  contactRegistrant?: GodaddyContact;
  contactAdmin?: GodaddyContact;
  contactTech?: GodaddyContact;
  contactBilling?: GodaddyContact;
}

/** An entry's three values as a config, or null when any is blank. */
export function godaddyConfigOf(apiKey: string, apiSecret: string, domain: string): GodaddyConfig | null {
  const cfg = { apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), domain: domain.trim().toLowerCase() };
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.domain) return null;
  return cfg;
}

/** The configured zone, or null when any part of it is missing. */
export async function godaddyConfig(): Promise<GodaddyConfig | null> {
  const [apiKey, apiSecret, domain] = await Promise.all([
    getRuntimeEnvValue('GODADDY_API_KEY'),
    getRuntimeEnvValue('GODADDY_API_SECRET'),
    getRuntimeEnvValue('GODADDY_DOMAIN'),
  ]);
  return godaddyConfigOf(apiKey, apiSecret, domain);
}

/** The configured zone, or a thrown error naming where to configure it. */
export async function requireGodaddyConfig(): Promise<GodaddyConfig> {
  const cfg = await godaddyConfig();
  if (!cfg) {
    throw new GraphQLError(
      'GoDaddy is not connected. Add the API key, secret and domain in Tech → Environment Variables → GoDaddy.',
      { extensions: { code: 'BAD_REQUEST' } }
    );
  }
  return cfg;
}

/** GoDaddy's `{ code, message, fields: [{ path, message }] }` refusal body. */
interface GodaddyErrorBody {
  code?: string;
  message?: string;
  fields?: Array<{ path?: string; message?: string }>;
}

/** GoDaddy's own reason, field complaints included — they name what to fix. */
function godaddyReason(body: GodaddyErrorBody): string {
  const fields = (body.fields ?? [])
    .map((field) => [field.path, field.message].filter(Boolean).join(': '))
    .filter(Boolean);
  return [body.message, ...fields].filter(Boolean).join(' · ');
}

/** What a refusal means, in words an operator can act on. */
function refusal(status: number, domain: string): string {
  if (status === 401) {
    return 'GoDaddy refused the API key and secret. Check both in Tech → Environment Variables → GoDaddy — a key made for the OTE test environment does not work here.';
  }
  if (status === 403) {
    return `GoDaddy did not let this key manage ${domain}. The key must belong to the account that owns the domain, and GoDaddy only opens its Domains API to accounts its API access policy allows.`;
  }
  if (status === 404) return `GoDaddy has no ${domain} in this account. Check the domain in Tech → Environment Variables → GoDaddy.`;
  if (status === 422) return 'GoDaddy refused the record.';
  if (status === 429) return 'GoDaddy is rate-limiting this key. Wait a minute and try again.';
  return `GoDaddy answered HTTP ${status}.`;
}

async function readBody(res: Response): Promise<unknown> {
  // PUT, PATCH and DELETE answer with an empty body; an error page is HTML.
  return res.json().catch(() => null);
}

/** One call on the zone. A refusal throws in plain words; a transport failure throws from `outboundFetch`. */
async function zoneCall(cfg: Readonly<GodaddyConfig>, method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await outboundFetch('GoDaddy', `${BASE_URL}/${encodeURIComponent(cfg.domain)}${path}`, {
    method,
    headers: {
      authorization: `sso-key ${cfg.apiKey}:${cfg.apiSecret}`,
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const payload = await readBody(res);
  if (!res.ok) {
    const reason = godaddyReason((payload ?? {}) as GodaddyErrorBody);
    const message = refusal(res.status, cfg.domain);
    throw new GraphQLError(reason ? `${message} GoDaddy said: ${reason}` : message, {
      extensions: { code: res.status === 422 ? 'BAD_USER_INPUT' : 'BAD_GATEWAY', godaddy_status: res.status },
    });
  }
  return payload;
}

/** `/records/{type}/{name}` — `@` and `_dmarc` alike survive the path. */
const setPath = (type: string, name: string) => `/records/${encodeURIComponent(type)}/${encodeURIComponent(name)}`;

/** The domain itself: status, expiry and the nameservers answering for it. */
export async function godaddyDomain(cfg: Readonly<GodaddyConfig>): Promise<GodaddyDomain> {
  return (await zoneCall(cfg, 'GET', '')) as GodaddyDomain;
}

/** Every record in the zone. */
export async function godaddyRecords(cfg: Readonly<GodaddyConfig>): Promise<GodaddyRecord[]> {
  return ((await zoneCall(cfg, 'GET', '/records')) as GodaddyRecord[] | null) ?? [];
}

/** Every record in one (type, name) set. */
export async function godaddyRecordSet(cfg: Readonly<GodaddyConfig>, type: string, name: string): Promise<GodaddySetRecord[]> {
  return ((await zoneCall(cfg, 'GET', setPath(type, name))) as GodaddySetRecord[] | null) ?? [];
}

/** Add records beside whatever is already there. */
export async function godaddyAddRecords(cfg: Readonly<GodaddyConfig>, records: readonly GodaddyRecord[]): Promise<void> {
  await zoneCall(cfg, 'PATCH', '/records', records);
}

/** Replace one (type, name) set with exactly `records`. */
export async function godaddyReplaceSet(
  cfg: Readonly<GodaddyConfig>,
  type: string,
  name: string,
  records: readonly GodaddySetRecord[]
): Promise<void> {
  await zoneCall(cfg, 'PUT', setPath(type, name), records);
}

/** Remove one (type, name) set entirely. */
export async function godaddyDeleteSet(cfg: Readonly<GodaddyConfig>, type: string, name: string): Promise<void> {
  await zoneCall(cfg, 'DELETE', setPath(type, name));
}
