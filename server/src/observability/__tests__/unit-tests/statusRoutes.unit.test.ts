import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildStatusProbeRouter, type ProbeResult } from '../../statusProbe';
import {
  parseHistoryHours,
  type IncidentRecord,
  type LatestCheck,
  type StatusHistoryStore,
} from '../../statusRoutes';
import type { ProbeDay } from '../../statusAnalytics';

const today = new Date().toISOString().slice(0, 10);

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

  const latestAdmin: LatestCheck = {
    ok: true,
    status_code: 200,
    latency_ms: 120,
    checked_at: `${today}T00:00:00.000Z`,
  };
  const latestFinanceDown: LatestCheck = {
    ok: false,
    status_code: 502,
    latency_ms: null,
    checked_at: `${today}T00:00:00.000Z`,
  };

  // admin recorded 23/24 OK checks today → today's bar dips to 95.83.
  const probeDaily = new Map<string, Map<string, ProbeDay>>([
    ['admin', new Map([[today, { ok: 23, total: 24 }]])],
  ]);

  // An OPEN major outage on the API server started 26h ago.
  const openIncident: IncidentRecord = {
    id: 'inc1',
    service_key: 'server',
    title: 'API server unreachable',
    body: 'Investigating 5xx errors.',
    impact: 'major_outage',
    status: 'investigating',
    started_at: new Date(Date.now() - 26 * 3_600_000),
    resolved_at: null,
  };

  const fakeStore: StatusHistoryStore = {
    probeDailyByService: jest.fn(async () => probeDaily),
    latestByService: jest.fn(
      async () =>
        new Map<string, LatestCheck>([
          ['admin', latestAdmin],
          ['finance', latestFinanceDown],
        ])
    ),
    points: jest.fn(async () => [
      { t: `${today}T00:00:00.000Z`, ok: true, status_code: 200, latency_ms: 90 },
    ]),
    incidents: jest.fn(async () => [openIncident]),
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
    expect(body.groups.map((g: { title: string }) => g.title)).toEqual([
      'Consoles',
      'Platform',
      'Websites',
    ]);
  });

  it('GET /status/summary is incident- and probe-aware across the catalog', async () => {
    const res = await fetch(`${baseUrl}/status/summary`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body.services)).toHaveLength(26);
    expect(body.global).toHaveLength(90);

    // admin: probe dip today, otherwise operational.
    const admin = body.services.admin;
    expect(admin.latest).toEqual(latestAdmin);
    expect(admin.daily).toHaveLength(90);
    expect(admin.uptime_24h).toBe(95.83);
    expect(admin.state).toBe('operational');
    expect(admin.daily.at(-1)).toEqual({ date: today, uptime: 95.83, state: 'degraded' });

    // server: open major incident → live state major, uptime below 100.
    const svr = body.services.server;
    expect(svr.state).toBe('major_outage');
    expect(svr.active_incidents).toBe(1);
    expect(svr.uptime_90d).toBeLessThan(100);

    // finance: latest probe down, no incident → live state down.
    expect(body.services.finance.state).toBe('down');

    // a service with no data at all is operational and 100%.
    expect(body.services.legal.state).toBe('operational');
    expect(body.services.legal.uptime_90d).toBe(100);

    // overall roll-up.
    expect(body.overall.total).toBe(26);
    expect(body.overall.down).toBeGreaterThanOrEqual(2); // server + finance
    expect(['major_outage', 'down']).toContain(body.overall.state);
  });

  it('GET /status/summary returns 500 when the store fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (fakeStore.probeDailyByService as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));
    const res = await fetch(`${baseUrl}/status/summary`);
    expect(res.status).toBe(500);
    errorSpy.mockRestore();
  });

  it('GET /status/history returns points and a 90-day daily series', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=admin&hours=48`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service).toBe('admin');
    expect(body.points).toEqual([
      { t: `${today}T00:00:00.000Z`, ok: true, status_code: 200, latency_ms: 90 },
    ]);
    expect(body.daily).toHaveLength(90);
    expect(body.daily.at(-1)).toEqual({ date: today, uptime: 95.83, state: 'degraded', incidents: 0 });
    const [key, , limit] = (fakeStore.points as jest.Mock).mock.calls.at(-1);
    expect(key).toBe('admin');
    expect(limit).toBe(500);
  });

  it('GET /status/history rejects an unknown service with 404', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=nope`);
    expect(res.status).toBe(404);
  });

  it('GET /status/history rejects invalid hours with 400', async () => {
    const res = await fetch(`${baseUrl}/status/history?service=admin&hours=99999`);
    expect(res.status).toBe(400);
  });

  it('GET /status/incidents lists incidents with the service name', async () => {
    const res = await fetch(`${baseUrl}/status/incidents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.incidents).toHaveLength(1);
    expect(body.incidents[0]).toMatchObject({
      id: 'inc1',
      service_key: 'server',
      service_name: 'API Server',
      impact: 'major_outage',
      status: 'investigating',
      resolved_at: null,
    });
  });

  it('keeps the original /status/probe route working', async () => {
    const res = await fetch(
      `${baseUrl}/status/probe?url=${encodeURIComponent('https://crm.duncit.com/')}`
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(fakeProbe);
  });
});
