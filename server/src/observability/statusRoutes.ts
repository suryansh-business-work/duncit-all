/**
 * Public read-only routes for the status page (mounted under `/status` by
 * buildStatusProbeRouter):
 *
 *   GET /status/services  — the monitored-service catalog (environment-aware)
 *   GET /status/summary   — per-service live state, uptime windows, 90-day
 *                           daily series + the global (all-services) roll-up
 *   GET /status/history   — raw probe points + 90-day daily series for one svc
 *   GET /status/incidents — recorded incidents over the last 90 days
 *
 * All Mongo access sits behind an injectable `StatusHistoryStore` (same pattern
 * as the injectable prober) so the routes are unit-testable without a database.
 */
import type { Router, Request, Response } from 'express';
import {
  findStatusService,
  getStatusEnvironment,
  getStatusServices,
  listStatusServices,
} from './statusServices';
import { StatusCheckModel } from './statusHistory.model';
import { IncidentModel, type IncidentImpact, type IncidentStatus } from './incident.model';
import {
  buildDailySeries,
  buildGlobalSeries,
  liveServiceState,
  windowStats,
  type DailyPoint,
  type GlobalDailyPoint,
  type ProbeDay,
  type ServiceState,
} from './statusAnalytics';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MAX_HISTORY_HOURS = 2160; // 90 days
const DEFAULT_HISTORY_HOURS = 24;
const MAX_HISTORY_POINTS = 500;
const DAILY_WINDOW_DAYS = 90;

export interface LatestCheck {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: string;
}

export interface HistoryPoint {
  t: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
}

export interface IncidentRecord {
  id: string;
  service_key: string;
  title: string;
  body: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  started_at: Date;
  resolved_at: Date | null;
}

export interface StatusHistoryStore {
  /** date(YYYY-MM-DD) → {ok,total} probe counts, per service key. */
  probeDailyByService(since: Date): Promise<Map<string, Map<string, ProbeDay>>>;
  /** latest probe result per service key. */
  latestByService(): Promise<Map<string, LatestCheck>>;
  /** raw probe points for one service, chronological. */
  points(serviceKey: string, since: Date, limit: number): Promise<HistoryPoint[]>;
  /** incidents overlapping [since, now] (plus any still open). */
  incidents(since: Date): Promise<IncidentRecord[]>;
}

interface DailyAggRow {
  _id: { key: string; date: string };
  ok: number;
  total: number;
}

interface LatestAggRow {
  _id: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: Date;
}

/** Default store backed by the StatusCheck + Incident collections. */
export const modelStatusHistoryStore: StatusHistoryStore = {
  async probeDailyByService(since) {
    const rows = await StatusCheckModel.aggregate<DailyAggRow>([
      { $match: { checked_at: { $gte: since } } },
      {
        $group: {
          _id: {
            key: '$service_key',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$checked_at' } },
          },
          ok: { $sum: { $cond: ['$ok', 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);
    const byService = new Map<string, Map<string, ProbeDay>>();
    for (const row of rows) {
      const perDay = byService.get(row._id.key) ?? new Map<string, ProbeDay>();
      perDay.set(row._id.date, { ok: row.ok, total: row.total });
      byService.set(row._id.key, perDay);
    }
    return byService;
  },

  async latestByService() {
    const rows = await StatusCheckModel.aggregate<LatestAggRow>([
      { $sort: { service_key: 1, checked_at: -1 } },
      {
        $group: {
          _id: '$service_key',
          ok: { $first: '$ok' },
          status_code: { $first: '$status_code' },
          latency_ms: { $first: '$latency_ms' },
          checked_at: { $first: '$checked_at' },
        },
      },
    ]);
    return new Map(
      rows.map((row) => [
        row._id,
        {
          ok: row.ok,
          status_code: row.status_code,
          latency_ms: row.latency_ms,
          checked_at: row.checked_at.toISOString(),
        },
      ])
    );
  },

  async points(serviceKey, since, limit) {
    const rows = await StatusCheckModel.find({ service_key: serviceKey, checked_at: { $gte: since } })
      .sort({ checked_at: -1 })
      .limit(limit)
      .lean();
    return rows.reverse().map((row) => ({
      t: row.checked_at.toISOString(),
      ok: row.ok,
      status_code: row.status_code,
      latency_ms: row.latency_ms,
    }));
  },

  async incidents(since) {
    const rows = await IncidentModel.find({
      $or: [{ started_at: { $gte: since } }, { resolved_at: null }, { resolved_at: { $gte: since } }],
    })
      .sort({ started_at: -1 })
      .lean();
    return rows.map((row) => ({
      id: String(row._id),
      service_key: row.service_key,
      title: row.title,
      body: row.body,
      impact: row.impact,
      status: row.status,
      started_at: row.started_at,
      resolved_at: row.resolved_at ?? null,
    }));
  },
};

/** `hours` query param → validated integer (1..2160), default 24, null = invalid. */
export function parseHistoryHours(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_HISTORY_HOURS;
  const hours = Number.parseInt(raw as string, 10);
  if (Number.isNaN(hours) || hours < 1 || hours > MAX_HISTORY_HOURS) return null;
  return hours;
}

interface ServiceSummary {
  latest: LatestCheck | null;
  uptime_24h: number | null;
  uptime_7d: number | null;
  uptime_90d: number | null;
  state: ServiceState;
  active_incidents: number;
  daily: Array<{ date: string; uptime: number; state: DailyPoint['state'] }>;
}

const stripDaily = (series: DailyPoint[]) =>
  series.map((point) => ({ date: point.date, uptime: point.uptime, state: point.state }));

function computeSummary(
  probeByService: Map<string, Map<string, ProbeDay>>,
  latestByKey: Map<string, LatestCheck>,
  incidents: IncidentRecord[],
  now: Date
): { services: Record<string, ServiceSummary>; global: GlobalDailyPoint[]; overall: OverallRoll } {
  const services: Record<string, ServiceSummary> = {};
  const perServiceSeries: DailyPoint[][] = [];
  for (const service of listStatusServices()) {
    const series = buildDailySeries({
      serviceKey: service.key,
      probeDaily: probeByService.get(service.key) ?? new Map(),
      incidents,
      days: DAILY_WINDOW_DAYS,
      now,
    });
    perServiceSeries.push(series);
    const latest = latestByKey.get(service.key) ?? null;
    const live = liveServiceState({
      serviceKey: service.key,
      incidents,
      latestOk: latest ? latest.ok : null,
    });
    services[service.key] = {
      latest,
      uptime_24h: windowStats(series, 1).uptime,
      uptime_7d: windowStats(series, 7).uptime,
      uptime_90d: windowStats(series, DAILY_WINDOW_DAYS).uptime,
      state: live.state,
      active_incidents: live.activeIncidents,
      daily: stripDaily(series),
    };
  }
  const global = buildGlobalSeries(perServiceSeries, DAILY_WINDOW_DAYS);
  return { services, global, overall: rollUp(services, global) };
}

interface OverallRoll {
  state: ServiceState;
  operational: number;
  degraded: number;
  down: number;
  total: number;
  uptime_90d: number | null;
}

function rollUp(services: Record<string, ServiceSummary>, global: GlobalDailyPoint[]): OverallRoll {
  let operational = 0;
  let degraded = 0;
  let down = 0;
  let worst: ServiceState = 'operational';
  const rows = Object.values(services);
  for (const row of rows) {
    if (row.state === 'operational') operational += 1;
    else if (row.state === 'down' || row.state === 'major_outage') down += 1;
    else degraded += 1;
    if (STATE_ORDER[row.state] > STATE_ORDER[worst]) worst = row.state;
  }
  const last = global.at(-1);
  return {
    state: worst,
    operational,
    degraded,
    down,
    total: rows.length,
    uptime_90d: last ? last.uptime : null,
  };
}

const STATE_ORDER: Record<ServiceState, number> = {
  operational: 0,
  nodata: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
  down: 5,
};

async function handleSummary(store: StatusHistoryStore, res: Response): Promise<void> {
  const now = new Date();
  const since = new Date(now.getTime() - DAILY_WINDOW_DAYS * DAY_MS);
  const [probeByService, latestByKey, incidents] = await Promise.all([
    store.probeDailyByService(since),
    store.latestByService(),
    store.incidents(since),
  ]);
  const { services, global, overall } = computeSummary(probeByService, latestByKey, incidents, now);
  res.json({ generated_at: now.toISOString(), overall, services, global });
}

async function handleHistory(store: StatusHistoryStore, req: Request, res: Response): Promise<void> {
  const key = String(req.query.service ?? '');
  if (!findStatusService(key)) {
    res.status(404).json({ error: 'Unknown service' });
    return;
  }
  const hours = parseHistoryHours(req.query.hours);
  if (hours === null) {
    res.status(400).json({ error: `hours must be an integer between 1 and ${MAX_HISTORY_HOURS}` });
    return;
  }
  const now = new Date();
  const since90d = new Date(now.getTime() - DAILY_WINDOW_DAYS * DAY_MS);
  const [points, probeByService, incidents] = await Promise.all([
    store.points(key, new Date(now.getTime() - hours * HOUR_MS), MAX_HISTORY_POINTS),
    store.probeDailyByService(since90d),
    store.incidents(since90d),
  ]);
  const daily = buildDailySeries({
    serviceKey: key,
    probeDaily: probeByService.get(key) ?? new Map(),
    incidents,
    days: DAILY_WINDOW_DAYS,
    now,
  });
  res.json({ service: key, points, daily });
}

async function handleIncidents(store: StatusHistoryStore, res: Response): Promise<void> {
  const since = new Date(Date.now() - DAILY_WINDOW_DAYS * DAY_MS);
  const nameByKey = new Map(listStatusServices().map((service) => [service.key, service.name]));
  const incidents = await store.incidents(since);
  res.json({
    generated_at: new Date().toISOString(),
    incidents: incidents.map((incident) => ({
      id: incident.id,
      service_key: incident.service_key,
      service_name: nameByKey.get(incident.service_key) ?? incident.service_key,
      title: incident.title,
      body: incident.body,
      impact: incident.impact,
      status: incident.status,
      started_at: incident.started_at.toISOString(),
      resolved_at: incident.resolved_at ? incident.resolved_at.toISOString() : null,
    })),
  });
}

/** Attach the public read routes to the /status router. */
export function registerStatusReadRoutes(router: Router, store: StatusHistoryStore): void {
  router.get('/services', (_req: Request, res: Response) => {
    res.json({
      generated_at: new Date().toISOString(),
      environment: getStatusEnvironment(),
      groups: getStatusServices(),
    });
  });

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      await handleSummary(store, res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[status] summary failed:', err);
      res.status(500).json({ error: 'Failed to load status summary' });
    }
  });

  router.get('/history', async (req: Request, res: Response) => {
    try {
      await handleHistory(store, req, res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[status] history failed:', err);
      res.status(500).json({ error: 'Failed to load status history' });
    }
  });

  router.get('/incidents', async (_req: Request, res: Response) => {
    try {
      await handleIncidents(store, res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[status] incidents failed:', err);
      res.status(500).json({ error: 'Failed to load incidents' });
    }
  });
}
