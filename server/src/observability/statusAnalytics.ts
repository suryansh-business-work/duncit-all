/**
 * Pure status-page analytics — no I/O, so it is fully unit-testable.
 *
 * Turns raw probe history (StatusCheck aggregates) plus recorded incidents
 * into the daily uptime series, per-window uptime %, live service state and
 * the global (all-services) roll-up that the status site renders.
 *
 * Design: every day defaults to 100% operational. Incidents overlay downtime
 * weighted by impact; real probe failures pull a day down too (whichever is
 * worse wins). This means a service with only "minimum data" still shows a
 * full 90-day chart — green by default, with incident days coloured.
 */
import type { IncidentImpact } from './incident.model';

export type DayState = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
export type ServiceState = DayState | 'down' | 'nodata';

const DAY_MS = 86_400_000;

/** Fraction of a day an incident of each impact counts as downtime. */
const IMPACT_WEIGHT: Record<IncidentImpact, number> = {
  degraded: 0.3,
  partial_outage: 0.6,
  major_outage: 1,
};

const IMPACT_STATE: Record<IncidentImpact, DayState> = {
  degraded: 'degraded',
  partial_outage: 'partial_outage',
  major_outage: 'major_outage',
};

/** Ordered worst-last, so `worseState` can pick the more severe of two. */
const STATE_RANK: Record<ServiceState, number> = {
  operational: 0,
  nodata: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
  down: 5,
};

export function worseState<T extends ServiceState>(a: T, b: T): T {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

export interface ProbeDay {
  ok: number;
  total: number;
}

export interface IncidentWindow {
  service_key: string;
  impact: IncidentImpact;
  started_at: Date;
  resolved_at: Date | null;
}

export interface DailyPoint {
  date: string;
  uptime: number;
  state: DayState;
  incidents: number;
}

export interface GlobalDailyPoint {
  date: string;
  uptime: number;
  state: DayState;
  operational: number;
  total: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** UTC midnight of the day `offset` days before `now`. */
function utcDayStart(now: Date, offset: number): Date {
  const d = new Date(now.getTime() - offset * DAY_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** Overlap in ms between an incident and the [start, end) window. */
function overlapMs(incident: IncidentWindow, start: number, end: number): number {
  const from = incident.started_at.getTime();
  const to = incident.resolved_at ? incident.resolved_at.getTime() : end;
  return Math.max(0, Math.min(to, end) - Math.max(from, start));
}

function probeState(probeUptime: number): DayState {
  if (probeUptime < 90) return 'major_outage';
  if (probeUptime < 99.9) return 'degraded';
  return 'operational';
}

/**
 * 90 (or `days`) daily uptime points for one service, most-recent last.
 * `probeDaily` maps YYYY-MM-DD → probe {ok,total}; `incidents` is the full
 * incident set (filtered to this service inside).
 */
export function buildDailySeries(params: {
  serviceKey: string;
  probeDaily: Map<string, ProbeDay>;
  incidents: IncidentWindow[];
  days: number;
  now: Date;
}): DailyPoint[] {
  const { serviceKey, probeDaily, incidents, days, now } = params;
  const mine = incidents.filter((incident) => incident.service_key === serviceKey);
  const series: DailyPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dayStart = utcDayStart(now, offset);
    const startMs = dayStart.getTime();
    const endMs = startMs + DAY_MS;
    const key = dayKey(dayStart);

    let downtimeMs = 0;
    let incidentCount = 0;
    let state: DayState = 'operational';
    for (const incident of mine) {
      const overlap = overlapMs(incident, startMs, endMs);
      if (overlap <= 0) continue;
      incidentCount += 1;
      downtimeMs += overlap * IMPACT_WEIGHT[incident.impact];
      state = worseState(state, IMPACT_STATE[incident.impact]);
    }
    let uptime = 100 * (1 - Math.min(downtimeMs, DAY_MS) / DAY_MS);

    const probe = probeDaily.get(key);
    if (probe && probe.total > 0) {
      const probeUptime = (100 * probe.ok) / probe.total;
      if (probeUptime < uptime) uptime = probeUptime;
      state = worseState(state, probeState(probeUptime));
    }

    series.push({ date: key, uptime: round2(uptime), state, incidents: incidentCount });
  }
  return series;
}

/** Average uptime + worst state over the last `windowDays` of a daily series. */
export function windowStats(
  series: DailyPoint[],
  windowDays: number
): { uptime: number | null; state: DayState; incidents: number } {
  const slice = series.slice(-windowDays);
  if (slice.length === 0) return { uptime: null, state: 'operational', incidents: 0 };
  let sum = 0;
  let state: DayState = 'operational';
  let incidents = 0;
  for (const point of slice) {
    sum += point.uptime;
    state = worseState(state, point.state);
    incidents += point.incidents;
  }
  return { uptime: round2(sum / slice.length), state, incidents };
}

/**
 * Live state of a service right now: an unresolved incident wins, else the
 * latest probe result, else operational (assumed up).
 */
export function liveServiceState(params: {
  serviceKey: string;
  incidents: IncidentWindow[];
  latestOk: boolean | null;
}): { state: ServiceState; activeIncidents: number } {
  const { serviceKey, incidents, latestOk } = params;
  const open = incidents.filter(
    (incident) => incident.service_key === serviceKey && incident.resolved_at === null
  );
  if (open.length > 0) {
    let state: ServiceState = 'operational';
    for (const incident of open) state = worseState(state, IMPACT_STATE[incident.impact]);
    return { state, activeIncidents: open.length };
  }
  if (latestOk === false) return { state: 'down', activeIncidents: 0 };
  if (latestOk === true) return { state: 'operational', activeIncidents: 0 };
  return { state: 'operational', activeIncidents: 0 };
}

/** Roll every service's daily series into one global availability series. */
export function buildGlobalSeries(perService: DailyPoint[][], days: number): GlobalDailyPoint[] {
  const result: GlobalDailyPoint[] = [];
  const total = perService.length;
  for (let index = 0; index < days; index += 1) {
    let sum = 0;
    let counted = 0;
    let operational = 0;
    let state: DayState = 'operational';
    let date = '';
    for (const series of perService) {
      const point = series[index];
      if (!point) continue;
      date = point.date;
      sum += point.uptime;
      counted += 1;
      if (point.state === 'operational') operational += 1;
      state = worseState(state, point.state);
    }
    if (counted === 0) continue;
    result.push({
      date,
      uptime: round2(sum / counted),
      state,
      operational,
      total,
    });
  }
  return result;
}
