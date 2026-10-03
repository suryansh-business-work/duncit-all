/**
 * Turns the host's certbot directory, as `ssl.host.ts` prints it, into the
 * certificates the Tech → SSL page lists.
 *
 * Only PUBLIC material crosses into the API: each lineage's `cert.pem` and its
 * renewal conf. The private keys stay on the host — the reader never prints them.
 */
import { X509Certificate } from 'node:crypto';

const DAY_MS = 86_400_000;
/** certbot's own default when a renewal conf sets no `renew_before_expiry`. */
const DEFAULT_RENEW_BEFORE_DAYS = 30;
const LE_STAGING_HINT = 'staging';

export const CERT_MARK = '@@CERT ';
export const CONF_MARK = '@@CONF';
export const END_MARK = '@@END';

export type SslCoverage = 'SINGLE' | 'MULTI' | 'WILDCARD';

export interface SslCertificate {
  name: string;
  common_name: string | null;
  domains: string[];
  coverage: SslCoverage;
  key_type: string;
  issuer: string | null;
  serial_number: string;
  fingerprint_sha256: string;
  valid_from: string;
  valid_to: string;
  days_remaining: number;
  renewal_due_at: string;
  authenticator: string | null;
  installer: string | null;
  /** False for a Let's Encrypt STAGING certificate — browsers do not trust those. */
  production_ca: boolean;
}

/** One `key = value` field of a certbot renewal conf, or null when it is absent. */
function confValue(conf: string, key: string): string | null {
  const line = conf
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith(`${key} =`) || l.startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim() || null : null;
}

/** certbot writes `renew_before_expiry = 30 days`; anything else falls back to its default. */
function renewBeforeDays(conf: string): number {
  const raw = confValue(conf, 'renew_before_expiry');
  const days = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RENEW_BEFORE_DAYS;
}

/** `DNS:a.com, DNS:b.com` → ['a.com', 'b.com']. */
function sanDomains(san: string | undefined): string[] {
  if (!san) return [];
  return san
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('DNS:'))
    .map((part) => part.slice(4));
}

/** A DN printed one `KEY=value` per line → the value of `key`. */
function dnField(dn: string, key: string): string | null {
  const line = dn.split('\n').find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
}

function keyTypeOf(cert: X509Certificate): string {
  const key = cert.publicKey;
  const details = key.asymmetricKeyDetails;
  if (key.asymmetricKeyType === 'rsa') return `RSA ${details?.modulusLength ?? ''}`.trim();
  if (key.asymmetricKeyType === 'ec') return `ECDSA ${details?.namedCurve ?? ''}`.trim();
  return (key.asymmetricKeyType ?? 'unknown').toUpperCase();
}

function coverageOf(domains: string[]): SslCoverage {
  if (domains.some((d) => d.startsWith('*.'))) return 'WILDCARD';
  return domains.length > 1 ? 'MULTI' : 'SINGLE';
}

/** One lineage → the page's certificate row. Null when its PEM does not parse. */
export function toCertificate(name: string, pem: string, conf: string, now = Date.now()): SslCertificate | null {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(pem);
  } catch {
    return null;
  }
  const validTo = new Date(cert.validTo);
  const domains = sanDomains(cert.subjectAltName);
  const server = confValue(conf, 'server');
  return {
    name,
    common_name: dnField(cert.subject, 'CN'),
    domains,
    coverage: coverageOf(domains),
    key_type: keyTypeOf(cert),
    issuer: dnField(cert.issuer, 'O') ?? dnField(cert.issuer, 'CN'),
    serial_number: cert.serialNumber,
    fingerprint_sha256: cert.fingerprint256,
    valid_from: new Date(cert.validFrom).toISOString(),
    valid_to: validTo.toISOString(),
    days_remaining: Math.floor((validTo.getTime() - now) / DAY_MS),
    renewal_due_at: new Date(validTo.getTime() - renewBeforeDays(conf) * DAY_MS).toISOString(),
    authenticator: confValue(conf, 'authenticator'),
    installer: confValue(conf, 'installer'),
    production_ca: !server?.includes(LE_STAGING_HINT),
  };
}

/**
 * The reader's output → every certificate on the host, soonest expiry first.
 * A lineage whose PEM is unreadable is skipped rather than failing the page.
 */
export function parseCertbotDump(dump: string, now = Date.now()): SslCertificate[] {
  const out: SslCertificate[] = [];
  for (const block of dump.split(CERT_MARK).slice(1)) {
    const name = block.slice(0, block.indexOf('\n')).trim();
    const body = block.slice(block.indexOf('\n') + 1);
    const confAt = body.indexOf(CONF_MARK);
    const endAt = body.indexOf(END_MARK);
    if (!name || confAt < 0 || endAt < confAt) continue;
    const cert = toCertificate(name, body.slice(0, confAt), body.slice(confAt + CONF_MARK.length, endAt), now);
    if (cert) out.push(cert);
  }
  return out.sort((a, b) => a.days_remaining - b.days_remaining);
}
