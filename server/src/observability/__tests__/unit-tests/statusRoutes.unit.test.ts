import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildStatusProbeRouter, type ProbeResult } from '../../statusProbe';
import {
  parseHistoryHours,
  uptimePct,
  type StatusHistoryStore,
} from '../../statusRoutes';

describe('uptimePct', () => {
  it('returns null when there is no data', () => {
    expect(uptimePct(undefined)).toBeNull();
    expect(uptimePct({ ok: 0, total: 0 })).toBeNull();
  });

  it('computes the percentage rounded to 2 decimals', () => {
    expect(uptimePct({ ok: 24, total: 24 })).toBe(100);
    expect(uptimePct({ ok: 23, total: 24 })).toBe(95.83);
    expect(uptimePct({ ok: 1, total: 3 })).toBe(33.33);
    expect(uptimePct({ ok: 0, total: 5 })).toBe(0);
  });
});

describe('parseHistoryHours', () => {
  it('defaults to 24 when absent', () => {
    expect(parseHistoryHours(undefined)).toBe(24);
  });

  it('accepts the 1..2160 range', () => {
    expect(parseHistoryHours('1')).toBe(1);
    expect(parseHistoryHours('2160')).toBe(2160);
  });

  it('rejects non-numeric and out-of-range values', () => {
    expect(parseHistoryHours('abc')).toBeNull();
    expect(parseHistoryHours('0')).toBeNull();
    expect(parseHistoryHours('2161')).toBeNull();
  });
});

describe('status read routes', () => {
  let server: Server;
  let baseUrl: string;

  const fakeProbe: ProbeResult = {
    url: 'https://crm.duncit.com/',
    ok: true,
    statusCode: 200,
    statusText: 'OK',
    ssl: null,
  };

  const latestAdmin = {
    ok: true,
    status_code: 200,
    latency_ms: 120,
    checked_at: '2026-07-11T00:00:00.000Z',
  };

  const fakeStore: StatusHistoryStore = {
    summary: jest.fn(async () => ({
      admin: {
        latest: latestAdmin,
        counts_24h: { ok: 23, total: 24 },
        counts_7d: { ok: 167, total: 168 },
        counts_90d: { ok: 2000, total: 2000 },
      },
    })),
    points: jest.fn(async () => [
      { t: '2026-07-11T00:00:00.000Z', ok: true, status_code: 200, latency_ms: 90 },
    ]),
    daily: jest.fn(async () => [{ date: '2026-07-11', uptime: 100, checks: 288 }]),
  };

  beforeAll(async () => {
    const app = express();
    app.use('/status', buildStatusProbeRouter(async () => fakeProbe, fakeStore));
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /status/services returns the environment-tagged catalog', async () => {
    const res = await fetch(`${baseUrl}/status/services`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.environment).toBe('production');
    expect(new Date(body.generated_at).toString()).not.toBe('Invalid Date');
    expect(body.groups.map((g: { title: string }) => g.title)).toEqual([
      'Consoles',
      'Platform',
      'Websites',
    ]);
    const admin = body.groups[0].items[0];
    expect(admin).toMatchObject({
      key: 'admin',
      name: 'Admin',
      url: 'https://admin.duncit.com/',
      description: 'Platform administration',
    });
  });

  it('GET /status/summary maps counts to uptime percentages', async () => {
    const res = await fetch(`${baseUrl}/status/summary`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services.admin).toEqual({
      latest: latestAdmin,
      uptime_24h: 95.83,
      uptime_7d: 99.4,
      uptime_90d: 100,
    });
  });

  it('GET /status/summary includes every catalog service, null when unchecked', async () => {
    const res = await fetch(`${baseUrl}/status/summary`);
    const body = await res.json();
    expect(Object.keys(body.services)).toHaveLength(26);
    expect(body.services.crm).toEqual({
      latest: null,
      uptime_24h: null,
      uptime_7d: null,
      uptime_90d: null,
    });
  });

  it('GET /status/summary returns 500 when the store fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (fakeStore.summary as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));
    const res = await fetch(`${baseUrl}/status/summary`);
    expect(res.status).toBe(500);
    errorSpy.mockRestore();
  });

  it('GET /status/history returns points and daily uptime for a known service', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=admin&hours=48`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      service: 'admin',
      points: [{ t: '2026-07-11T00:00:00.000Z', ok: true, status_code: 200, latency_ms: 90 }],
      daily: [{ date: '2026-07-11', uptime: 100, checks: 288 }],
    });
    const [key, since, limit] = (fakeStore.points as jest.Mock).mock.calls.at(-1);
    expect(key).toBe('admin');
    expect(limit).toBe(500);
    const expectedSince = Date.now() - 48 * 3_600_000;
    expect(Math.abs((since as Date).getTime() - expectedSince)).toBeLessThan(5_000);
  });

  it('GET /status/history rejects an unknown service with 404', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=nope`);
    expect(res.status).toBe(404);
  });

  it('GET /status/history rejects invalid hours with 400', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=admin&hours=99999`);
    expect(res.status).toBe(400);
  });

  it('keeps the original /status/probe route working', async () => {
    const res = await fetch(
      `${baseUrl}/status/probe?url=${encodeURIComponent('https://crm.duncit.com/')}`,
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(fakeProbe);
  });
});
