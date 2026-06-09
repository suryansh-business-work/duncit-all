import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { PeerCertificate } from 'node:tls';
import {
  isAllowedHost,
  buildSsl,
  probe,
  buildStatusProbeRouter,
  type ProbeResult,
} from '../../statusProbe';

describe('isAllowedHost', () => {
  it('allows the apex and any duncit.com subdomain', () => {
    expect(isAllowedHost('duncit.com')).toBe(true);
    expect(isAllowedHost('crm.duncit.com')).toBe(true);
    expect(isAllowedHost('sonarqube.duncit.com')).toBe(true);
  });

  it('rejects foreign or look-alike hosts', () => {
    expect(isAllowedHost('evil.com')).toBe(false);
    expect(isAllowedHost('duncit.com.evil.com')).toBe(false);
    expect(isAllowedHost('notduncit.com')).toBe(false);
  });
});

describe('buildSsl', () => {
  const cert = (over: Partial<PeerCertificate> = {}): PeerCertificate =>
    ({
      issuer: { O: "Let's Encrypt", CN: 'R3' },
      subject: { CN: 'crm.duncit.com' },
      valid_from: 'Jan 1 00:00:00 2026 GMT',
      valid_to: 'Dec 31 00:00:00 2099 GMT',
      ...over,
    }) as unknown as PeerCertificate;

  it('extracts issuer/subject/dates and computes days remaining', () => {
    const ssl = buildSsl(cert(), { authorized: true, protocol: 'TLSv1.3' });
    expect(ssl.authorized).toBe(true);
    expect(ssl.issuer).toBe("Let's Encrypt");
    expect(ssl.subject).toBe('crm.duncit.com');
    expect(ssl.protocol).toBe('TLSv1.3');
    expect(ssl.validFrom).toBe(
      new Date('Jan 1 00:00:00 2026 GMT').toISOString(),
    );
    expect(ssl.daysRemaining).toBeGreaterThan(0);
  });

  it('falls back to issuer CN when O is absent', () => {
    const ssl = buildSsl(
      cert({ issuer: { CN: 'R3' } as PeerCertificate['issuer'] }),
      {
        authorized: false,
        protocol: null,
      },
    );
    expect(ssl.issuer).toBe('R3');
    expect(ssl.authorized).toBe(false);
    expect(ssl.protocol).toBeNull();
  });

  it('returns nulls for missing issuer/subject and invalid dates', () => {
    const ssl = buildSsl(
      {
        issuer: undefined as unknown as PeerCertificate['issuer'],
        subject: undefined as unknown as PeerCertificate['subject'],
        valid_from: 'not-a-date',
        valid_to: '',
      },
      { authorized: false, protocol: 'TLSv1.2' },
    );
    expect(ssl.issuer).toBeNull();
    expect(ssl.subject).toBeNull();
    expect(ssl.validFrom).toBeNull();
    expect(ssl.validTo).toBeNull();
    expect(ssl.daysRemaining).toBeNull();
  });
});

describe('probe', () => {
  it('resolves ok:false with an error for an unreachable host', async () => {
    const result = await probe(new URL('https://127.0.0.1:1/'));
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.ssl).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('status probe router', () => {
  let server: Server;
  let baseUrl: string;
  const fakeResult: ProbeResult = {
    url: 'https://crm.duncit.com/',
    ok: true,
    statusCode: 200,
    statusText: 'OK',
    ssl: {
      authorized: true,
      issuer: "Let's Encrypt",
      subject: 'crm.duncit.com',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-04-01T00:00:00.000Z',
      daysRemaining: 30,
      protocol: 'TLSv1.3',
    },
  };

  beforeAll(async () => {
    const app = express();
    app.use(
      '/status',
      buildStatusProbeRouter(async () => fakeResult),
    );
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const call = (url: string) =>
    fetch(`${baseUrl}/status/probe?url=${encodeURIComponent(url)}`);

  it('returns the probe result for an allowed https host', async () => {
    const res = await call('https://crm.duncit.com/');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(fakeResult);
  });

  it('rejects a malformed url with 400', async () => {
    const res = await call('not a url');
    expect(res.status).toBe(400);
  });

  it('rejects a non-https url with 400', async () => {
    const res = await call('http://crm.duncit.com/');
    expect(res.status).toBe(400);
  });

  it('rejects a host outside duncit.com with 403', async () => {
    const res = await call('https://evil.com/');
    expect(res.status).toBe(403);
  });
});
