/**
 * Public read-only routes for the status page (mounted under `/status` by
 * buildStatusProbeRouter):
 *
 *   GET /status/services — the monitored-service catalog (environment-aware)
 *   GET /status/summary  — latest check + 24h/7d/90d uptime per service
 *   GET /status/history  — raw points + 90-day daily uptime for one service
 *
 * The Mongo access sits behind an injectable `StatusHistoryStore` (same
 * pattern as the injectable prober) so the routes are unit-testable.
 */
import type { Router, Request, Response } from 'express';
import {
  findStatusService,
  getStatusEnvironment,
  getStatusServices,
  listStatusServices,
} from './statusServices';
import { StatusCheckModel } from './statusHistory.model';

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

export interface UptimeCounts {
  ok: number;
  total: number;
}

export interface ServiceSummaryRow {
  latest: LatestCheck | null;
  counts_24h: UptimeCounts;
  counts_7d: UptimeCounts;
  counts_90d: UptimeCounts;
}

export interface HistoryPoint {
  t: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
}

export interface DailyUptime {
  date: string;
  uptime: number | null;
  checks: number;
}

export interface StatusHistoryStore {
  summary(): Promise<Record<string, ServiceSummaryRow>>;
  points(serviceKey: string, since: Date, limit: number): Promise<HistoryPoint[]>;
  daily(serviceKey: string, since: Date): Promise<DailyUptime[]>;
}

/** ok/total → percentage rounded to 2 decimals, or null when there is no data. */
export function uptimePct(counts: UptimeCounts | undefined): number | null {
  if (!counts || counts.total <= 0) return null;
  return Math.round((counts.ok / counts.total) * 10_000) / 100;
}

/** `hours` query param → validated integer (1..2160), default 24, null = invalid. */
export function parseHistoryHours(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_HISTORY_HOURS;
  const hours = Number.parseInt(String(raw), 10);
  if (Number.isNaN(hours) || hours < 1 || hours > MAX_HISTORY_HOURS) return null;
  return hours;
}

interface SummaryAggRow {
  _id: string;
  ok_24h: number;
  total_24h: number;
  ok_7d: number;
  total_7d: number;
  ok_90d: number;
  total_90d: number;
}

interface LatestAggRow {
  _id: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: Date;
}

const okInWindow = (since: Date) => ({
  $sum: { $cond: [{ $and: ['$ok', { $gte: ['$checked_at', since] }] }, 1, 0] },
});
const totalInWindow = (since: Date) => ({
  $sum: { $cond: [{ $gte: ['$checked_at', since] }, 1, 0] },
});

/** Default store backed by the StatusCheck collection. */
export const modelStatusHistoryStore: StatusHistoryStore = {
  async summary() {
    const now = Date.now();
    const since24h = new Date(now - DAY_MS);
    const since7d = new Date(now - 7 * DAY_MS);
    const since90d = new Date(now - DAILY_WINDOW_DAYS * DAY_MS);
    const [windows, latest] = await Promise.all([
      StatusCheckModel.aggregate<SummaryAggRow>([
        { $match: { checked_at: { $gte: since90d } } },
        {
          $group: {
            _id: '$service_key',
            ok_24h: okInWindow(since24h),
            total_24h: totalInWindow(since24h),
            ok_7d: okInWindow(since7d),
            total_7d: totalInWindow(since7d),
            ok_90d: { $sum: { $cond: ['$ok', 1, 0] } },
            total_90d: { $sum: 1 },
          },
        },
      ]),
      StatusCheckModel.aggregate<LatestAggRow>([
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
      ]),
    ]);
    const latestByKey = new Map(latest.map((row) => [row._id, row]));
    const result: Record<string, ServiceSummaryRow> = {};
    for (const row of windows) {
      const last = latestByKey.get(row._id);
      result[row._id] = {
        latest: last
          ? {
              ok: last.ok,
              status_code: last.status_code,
              latency_ms: last.latency_ms,
              checked_at: last.checked_at.toISOString(),
            }
          : null,
        counts_24h: { ok: row.ok_24h, total: row.total_24h },
        counts_7d: { ok: row.ok_7d, total: row.total_7d },
        counts_90d: { ok: row.ok_90d, total: row.total_90d },
      };
    }
    return result;
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

  async daily(serviceKey, since) {
    const rows = await StatusCheckModel.aggregate<{ _id: string; ok: number; total: number }>([
      { $match: { service_key: serviceKey, checked_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$checked_at' } },
          ok: { $sum: { $cond: ['$ok', 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((row) => ({
      date: row._id,
      uptime: uptimePct({ ok: row.ok, total: row.total }),
      checks: row.total,
    }));
  },
};

async function handleSummary(store: StatusHistoryStore, res: Response): Promise<void> {
  const rows = await store.summary();
  const services: Record<
    string,
    { latest: LatestCheck | null; uptime_24h: number | null; uptime_7d: number | null; uptime_90d: number | null }
  > = {};
  for (const service of listStatusServices()) {
    const row = rows[service.key];
    services[service.key] = {
      latest: row?.latest ?? null,
      uptime_24h: uptimePct(row?.counts_24h),
      uptime_7d: uptimePct(row?.counts_7d),
      uptime_90d: uptimePct(row?.counts_90d),
    };
  }
  res.json({ generated_at: new Date().toISOString(), services });
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
  const now = Date.now();
  const [points, daily] = await Promise.all([
    store.points(key, new Date(now - hours * HOUR_MS), MAX_HISTORY_POINTS),
    store.daily(key, new Date(now - DAILY_WINDOW_DAYS * DAY_MS)),
  ]);
  res.json({ service: key, points, daily });
}

/** Attach the three public read routes to the /status router. */
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
}
