/**
 * Tech → SSL: every certificate certbot holds on this VPS and whether each host
 * actually serves it. Read-only — renewal stays with certbot's own timer and
 * the deploy's `scripts/configure-nginx-tls.sh`.
 *
 * Production and staging share the host, so both consoles list the same
 * certificates.
 */
import { isAllowedHost, probe } from '../../../observability/statusProbe';
import { parseCertbotDump, type SslCertificate } from './ssl.parse';
import { readCertbotDump } from './ssl.host';

export interface SslOverview {
  available: boolean;
  error: string | null;
  certificates: SslCertificate[];
  checked_at: string;
}

export interface SslLiveCheck {
  domain: string;
  checked: boolean;
  reachable: boolean;
  trusted: boolean;
  /** The host answers with THIS lineage's certificate (same expiry), not an older or foreign one. */
  serving_this: boolean;
  valid_to: string | null;
  days_remaining: number | null;
  protocol: string | null;
  error: string | null;
}

async function listCertificates(): Promise<SslOverview> {
  const { dump, error } = await readCertbotDump();
  return {
    available: !error,
    error,
    certificates: error ? [] : parseCertbotDump(dump),
    checked_at: new Date().toISOString(),
  };
}

/** Wildcards cannot be dialled, and only our own hosts may be probed (SSRF guard). */
async function checkDomain(domain: string, cert: SslCertificate): Promise<SslLiveCheck> {
  const base: SslLiveCheck = {
    domain,
    checked: false,
    reachable: false,
    trusted: false,
    serving_this: false,
    valid_to: null,
    days_remaining: null,
    protocol: null,
    error: null,
  };
  if (domain.startsWith('*.') || !isAllowedHost(domain)) return base;
  const res = await probe(new URL(`https://${domain}`));
  const ssl = res.ssl;
  return {
    ...base,
    checked: true,
    reachable: !!ssl,
    trusted: ssl?.authorized ?? false,
    serving_this: ssl?.validTo === cert.valid_to,
    valid_to: ssl?.validTo ?? null,
    days_remaining: ssl?.daysRemaining ?? null,
    protocol: ssl?.protocol ?? null,
    error: res.error ?? null,
  };
}

export const sslService = {
  certificates: listCertificates,

  /** Dial every host on one certificate and report what it really serves. */
  async liveCheck(name: string): Promise<SslLiveCheck[]> {
    const { certificates } = await listCertificates();
    const cert = certificates.find((c) => c.name === name);
    if (!cert) throw new Error(`No certificate named ${name} on this host`);
    return Promise.all(cert.domains.map((domain) => checkDomain(domain, cert)));
  },
};
