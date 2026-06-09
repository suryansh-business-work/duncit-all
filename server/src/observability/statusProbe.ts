/**
 * Status-page probe endpoint (`GET /status/probe?url=<https url>`).
 *
 * The public status page (status.duncit.com) is a static site, so it can only
 * detect *reachability* client-side (opaque no-cors fetch). To surface the real
 * HTTP status code and the TLS certificate details in its "Details" dialog it
 * calls this server-side probe, which performs the request from Node and reads
 * `res.statusCode` plus the peer certificate off the TLS socket.
 *
 * SSRF guard: only hosts under duncit.com may be probed.
 */
import { Router, type Request, type Response } from 'express';
import https from 'node:https';
import type { PeerCertificate, TLSSocket } from 'node:tls';

const ALLOWED_HOST = 'duncit.com';
const PROBE_TIMEOUT_MS = 8000;
const DAY_MS = 86_400_000;

export interface SslInfo {
  /** True when the certificate chain validates against the system trust store. */
  authorized: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
}

export interface ProbeResult {
  url: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string | null;
  ssl: SslInfo | null;
  error?: string;
}

/** Only allow probing the platform's own hosts (prevents SSRF abuse). */
export function isAllowedHost(hostname: string): boolean {
  return hostname === ALLOWED_HOST || hostname.endsWith(`.${ALLOWED_HOST}`);
}

/** A distinguished-name field may repeat a key, so @types/node types it as
 *  `string | string[]`. Collapse it to the first value. */
function firstOf(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toIso(raw: string | undefined): {
  iso: string | null;
  date: Date | null;
} {
  if (!raw) return { iso: null, date: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { iso: null, date: null };
  return { iso: date.toISOString(), date };
}

/** Build the SSL summary from a peer certificate + socket metadata. */
export function buildSsl(
  cert: Pick<PeerCertificate, 'issuer' | 'subject' | 'valid_from' | 'valid_to'>,
  meta: { authorized: boolean; protocol: string | null },
): SslInfo {
  const from = toIso(cert.valid_from);
  const to = toIso(cert.valid_to);
  return {
    authorized: meta.authorized,
    issuer: firstOf(cert.issuer?.O) ?? firstOf(cert.issuer?.CN),
    subject: firstOf(cert.subject?.CN),
    validFrom: from.iso,
    validTo: to.iso,
    daysRemaining: to.date
      ? Math.floor((to.date.getTime() - Date.now()) / DAY_MS)
      : null,
    protocol: meta.protocol,
  };
}

/** Probe a single HTTPS URL for its status code and TLS certificate. */
export function probe(target: URL): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const base: ProbeResult = {
      url: target.toString(),
      ok: false,
      statusCode: null,
      statusText: null,
      ssl: null,
    };
    // rejectUnauthorized:false lets the handshake complete even for an expired
    // or untrusted cert so we can still report its details; socket.authorized
    // tells the page whether the chain actually validated.
    const req = https.request(
      target,
      { method: 'GET', timeout: PROBE_TIMEOUT_MS, rejectUnauthorized: false },
      (res) => {
        const socket = res.socket as TLSSocket;
        const cert = socket.getPeerCertificate?.();
        const ssl =
          cert && Object.keys(cert).length > 0
            ? buildSsl(cert, {
                authorized: socket.authorized,
                protocol: socket.getProtocol(),
              })
            : null;
        const statusCode = res.statusCode ?? null;
        res.destroy();
        resolve({
          url: target.toString(),
          ok: statusCode !== null && statusCode < 500,
          statusCode,
          statusText: res.statusMessage ?? null,
          ssl,
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ...base, error: 'Request timed out' });
    });
    req.on('error', (err: Error) => resolve({ ...base, error: err.message }));
    req.end();
  });
}

/**
 * Router for the status probe. `prober` is injectable so the route's
 * validation can be unit-tested without hitting the network.
 */
export function buildStatusProbeRouter(
  prober: (target: URL) => Promise<ProbeResult> = probe,
): Router {
  const router = Router();
  router.get('/probe', async (req: Request, res: Response) => {
    const raw = String(req.query.url ?? '');
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      res.status(400).json({ ok: false, error: 'Invalid url parameter' });
      return;
    }
    if (target.protocol !== 'https:') {
      res
        .status(400)
        .json({ ok: false, error: 'Only https urls can be probed' });
      return;
    }
    if (!isAllowedHost(target.hostname)) {
      res.status(403).json({ ok: false, error: 'Host not allowed' });
      return;
    }
    res.json(await prober(target));
  });
  return router;
}
