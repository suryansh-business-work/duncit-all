import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * Cloudflare's v4 API — the only file in the server that knows Cloudflare's
 * URLs, auth header and response envelope.
 *
 * The token is owned by the Tech portal (Cloudflare env category), never
 * `.env`, and is read fresh per call so a rotated token applies without a
 * restart. It needs Zone:Read, Zone:Edit (to add the zone) and DNS:Edit — the
 * same scopes infra/terraform/dns asks for.
 */
const BASE_URL = 'https://api.cloudflare.com/client/v4';

/** No Cloudflare call gets longer than this to answer. */
const TIMEOUT_MS = 15_000;

/** Cloudflare's own page-size ceiling for the DNS record listing. */
const PER_PAGE = 1000;

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  domain: string;
}

/** The zone as Cloudflare reports it. `name_servers` are the two it assigned this account. */
export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused?: boolean;
  name_servers?: string[];
  activated_on?: string | null;
}

/** One DNS record in the zone. `name` comes back fully qualified. */
export interface CloudflareRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  data?: CloudflareRecordData;
}

/** The structured half of an SRV or CAA record — Cloudflare's fields for what GoDaddy keeps in one string. */
export interface CloudflareRecordData {
  priority?: number;
  weight?: number;
  port?: number;
  target?: string;
  flags?: number;
  tag?: string;
  value?: string;
}

/** What a create sends. CAA and SRV carry `data` instead of `content`. */
export interface CloudflareRecordInput {
  type: string;
  name: string;
  content?: string;
  data?: CloudflareRecordData;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  comment?: string;
}

/** An entry's three values as a config, or null when any is blank. */
export function cloudflareConfigOf(apiToken: string, accountId: string, domain: string): CloudflareConfig | null {
  const cfg = { apiToken: apiToken.trim(), accountId: accountId.trim(), domain: domain.trim().toLowerCase() };
  if (!cfg.apiToken || !cfg.accountId || !cfg.domain) return null;
  return cfg;
}

/** The configured account, or null when any part of it is missing. */
export async function cloudflareConfig(): Promise<CloudflareConfig | null> {
  const [apiToken, accountId, domain] = await Promise.all([
    getRuntimeEnvValue('CLOUDFLARE_API_TOKEN'),
    getRuntimeEnvValue('CLOUDFLARE_ACCOUNT_ID'),
    getRuntimeEnvValue('CLOUDFLARE_DOMAIN'),
  ]);
  return cloudflareConfigOf(apiToken, accountId, domain);
}

/** The configured account, or a thrown error naming where to configure it. */
export async function requireCloudflareConfig(): Promise<CloudflareConfig> {
  const cfg = await cloudflareConfig();
  if (!cfg) {
    throw new GraphQLError(
      'Cloudflare is not connected. Add the API token, account ID and domain in Tech → Environment Variables → Cloudflare.',
      { extensions: { code: 'BAD_REQUEST' } }
    );
  }
  return cfg;
}

/** Cloudflare's `{ success, errors: [{ code, message }], result, result_info }` envelope. */
interface CloudflareEnvelope {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: unknown;
  result_info?: { page?: number; total_pages?: number };
}

/** What a refusal means, in words an operator can act on. */
function refusal(status: number): string {
  if (status === 400) return 'Cloudflare refused the request.';
  if (status === 401) {
    return 'Cloudflare refused the API token. Check it in Tech → Environment Variables → Cloudflare — it must be an API token, not the Global API key.';
  }
  if (status === 403) {
    return 'The Cloudflare token is missing a permission. It needs Zone:Read, Zone:Edit and DNS:Edit on this account.';
  }
  if (status === 404) return 'Cloudflare has no such zone or record in this account.';
  if (status === 429) return 'Cloudflare is rate-limiting this token. Wait a minute and try again.';
  return `Cloudflare answered HTTP ${status}.`;
}

/** One call. A refusal throws in plain words with Cloudflare's own reason; a transport failure throws from `outboundFetch`. */
async function call(cfg: Readonly<CloudflareConfig>, method: string, path: string, body?: unknown): Promise<CloudflareEnvelope> {
  const res = await outboundFetch('Cloudflare', `${BASE_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${cfg.apiToken}`,
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const payload = ((await res.json().catch(() => null)) ?? {}) as CloudflareEnvelope;
  if (res.ok && payload.success !== false) return payload;
  const reason = (payload.errors ?? []).map((error) => error.message).filter(Boolean).join(' · ');
  const message = refusal(res.status);
  throw new GraphQLError(reason ? `${message} Cloudflare said: ${reason}` : message, {
    extensions: { code: res.status === 400 ? 'BAD_USER_INPUT' : 'BAD_GATEWAY', cloudflare_status: res.status },
  });
}

/** Whether the token is live — Cloudflare's own verify endpoint. */
export async function cloudflareVerifyToken(cfg: Readonly<CloudflareConfig>): Promise<string> {
  const { result } = await call(cfg, 'GET', '/user/tokens/verify');
  return (result as { status?: string } | undefined)?.status ?? 'unknown';
}

/** The configured domain's zone in this account, or null before it has been added. */
export async function cloudflareZone(cfg: Readonly<CloudflareConfig>): Promise<CloudflareZone | null> {
  const query = new URLSearchParams({ name: cfg.domain, 'account.id': cfg.accountId });
  const { result } = await call(cfg, 'GET', `/zones?${query.toString()}`);
  return ((result as CloudflareZone[] | undefined) ?? [])[0] ?? null;
}

/** Add the domain as a full-setup zone. Cloudflare assigns its nameservers here. */
export async function cloudflareCreateZone(cfg: Readonly<CloudflareConfig>): Promise<CloudflareZone> {
  const { result } = await call(cfg, 'POST', '/zones', { name: cfg.domain, account: { id: cfg.accountId }, type: 'full' });
  return result as CloudflareZone;
}

/** Ask Cloudflare to look at the nameservers again now, rather than on its own schedule. */
export async function cloudflareActivationCheck(cfg: Readonly<CloudflareConfig>, zoneId: string): Promise<void> {
  await call(cfg, 'PUT', `/zones/${encodeURIComponent(zoneId)}/activation_check`);
}

const recordsPage = (cfg: Readonly<CloudflareConfig>, zoneId: string, page: number) =>
  call(
    cfg,
    'GET',
    `/zones/${encodeURIComponent(zoneId)}/dns_records?${new URLSearchParams({ per_page: String(PER_PAGE), page: String(page) }).toString()}`
  );

/** Every DNS record in the zone. The first page says how many more there are; those are read together. */
export async function cloudflareRecords(cfg: Readonly<CloudflareConfig>, zoneId: string): Promise<CloudflareRecord[]> {
  const first = await recordsPage(cfg, zoneId, 1);
  const totalPages = first.result_info?.total_pages ?? 1;
  const rest = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => recordsPage(cfg, zoneId, i + 2))
  );
  return [first, ...rest].flatMap((envelope) => (envelope.result as CloudflareRecord[] | undefined) ?? []);
}

export async function cloudflareCreateRecord(
  cfg: Readonly<CloudflareConfig>,
  zoneId: string,
  record: Readonly<CloudflareRecordInput>
): Promise<void> {
  await call(cfg, 'POST', `/zones/${encodeURIComponent(zoneId)}/dns_records`, record);
}

export async function cloudflareDeleteRecord(cfg: Readonly<CloudflareConfig>, zoneId: string, recordId: string): Promise<void> {
  await call(cfg, 'DELETE', `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`);
}
