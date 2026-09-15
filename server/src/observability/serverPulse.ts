import os from 'node:os';
import { randomInt } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import { requestIdentity } from './requestIdentity';
import { getIo } from '../realtime/io';
import { buildMemory, cpuTotals } from '../modules/platform/tech/tech.service';
import { isStressTraffic } from '../modules/platform/stressTest/stressTest.traffic';

/**
 * The server's live pulse: how busy this process is RIGHT NOW, and who is
 * behind the traffic.
 *
 * Always on and deliberately cheap — one counter bump per request into a
 * per-second ring, and a five-second tick for the two readings that need a
 * delta (host CPU, event-loop delay). Nothing is written here: the Tech
 * portal reads it live, a stress run's sampler copies it into the run's time
 * series, and the server-history sampler drains its window every few minutes
 * (Tech > Server > Info's 30-day charts).
 *
 * Stress traffic is counted SEPARATELY from real traffic (it carries a verified
 * run key, see stressTest.traffic), which is the whole point of reading this
 * during a run: "the server is at 400 rps" means nothing until you know how
 * much of it is the bots and how many real people are on at the same time.
 */

const RING_SECONDS = 60;
const RATE_WINDOW_SECONDS = 10;
const ACTIVE_WINDOW_MS = 60_000;
const TICK_MS = 5_000;
/** Enough to read a p95 off; bounded so a busy second cannot grow memory. */
const LATENCY_SAMPLES_PER_SECOND = 200;
/** A ceiling on the visitor map — a flood of unique addresses must not become a leak. */
const MAX_TRACKED_VISITORS = 50_000;
/** The token every stress bot puts in its user agent. */
const STRESS_BOT_AGENT = 'DuncitStressBot';

interface Bucket {
  second: number;
  requests: number;
  stress: number;
  errors5xx: number;
  latencies: number[];
}

const ring: Bucket[] = Array.from({ length: RING_SECONDS }, () => ({
  second: -1,
  requests: 0,
  stress: 0,
  errors5xx: 0,
  latencies: [],
}));

let inFlight = 0;
/** Signed-in accounts: user id → last seen (ms) and the surface they came from. */
const users = new Map<string, { at: number; surface: string }>();
/** Anonymous visitors: device id, else address → last seen (ms). */
const visitors = new Map<string, number>();

const ticked = { cpuPct: 0, lagMs: 0, lagP99Ms: 0 };

/** Reservoir size for the history window's latency percentile (a window is minutes, not a second). */
const WINDOW_LATENCY_SAMPLES = 2_000;

/**
 * Real (non-stress) traffic and host readings since the history sampler last
 * drained them — so a stored sample describes its whole window, not the ten
 * seconds before it was taken.
 */
const windowed = {
  requests: 0,
  errors5xx: 0,
  totalMs: 0,
  maxMs: 0,
  latencies: [] as number[],
  cpuSum: 0,
  cpuTicks: 0,
  cpuMax: 0,
  lagP99Max: 0,
};
let lastCpu = cpuTotals();
const loopDelay = monitorEventLoopDelay({ resolution: 20 });
let timer: NodeJS.Timeout | null = null;

function bucketFor(nowMs: number): Bucket {
  const second = Math.floor(nowMs / 1000);
  const bucket = ring[second % RING_SECONDS];
  if (bucket.second !== second) {
    bucket.second = second;
    bucket.requests = 0;
    bucket.stress = 0;
    bucket.errors5xx = 0;
    bucket.latencies = [];
  }
  return bucket;
}

function noteCaller(nowMs: number): void {
  const identity = requestIdentity.current();
  if (!identity) return;
  // A stress run's browser tabs cannot carry the stress header (see
  // scripts/stress/browser-bots.mjs), so their agent names them. Unverified on
  // purpose: spoofing it only removes yourself from a head count.
  if (identity.user_agent?.includes(STRESS_BOT_AGENT)) return;
  if (identity.user?.id) {
    users.set(identity.user.id, { at: nowMs, surface: identity.surface ?? 'OTHER' });
    return;
  }
  const key = identity.duid ?? identity.ip;
  if (!key) return;
  if (visitors.size >= MAX_TRACKED_VISITORS && !visitors.has(key)) return;
  visitors.set(key, nowMs);
}

function recordWindow(status: number, ms: number): void {
  windowed.requests += 1;
  if (status >= 500) windowed.errors5xx += 1;
  windowed.totalMs += ms;
  windowed.maxMs = Math.max(windowed.maxMs, ms);
  if (windowed.latencies.length < WINDOW_LATENCY_SAMPLES) {
    windowed.latencies.push(ms);
    return;
  }
  const slot = randomInt(windowed.requests);
  if (slot < WINDOW_LATENCY_SAMPLES) windowed.latencies[slot] = ms;
}

function record(stress: boolean, status: number, ms: number): void {
  if (!stress) recordWindow(status, ms);
  const bucket = bucketFor(Date.now());
  bucket.requests += 1;
  if (stress) bucket.stress += 1;
  if (status >= 500) bucket.errors5xx += 1;
  if (bucket.latencies.length < LATENCY_SAMPLES_PER_SECOND) {
    bucket.latencies.push(ms);
  } else {
    // Reservoir replacement keeps the sample representative of the whole second.
    const slot = randomInt(bucket.requests);
    if (slot < LATENCY_SAMPLES_PER_SECOND) bucket.latencies[slot] = ms;
  }
}

/**
 * Count every request. Mounted after requestIdentityMiddleware, so the caller
 * it attributes a request to is the one that store already verified.
 */
export function serverPulseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const started = performance.now();
  const stress = isStressTraffic(req);
  inFlight += 1;
  if (!stress) noteCaller(Date.now());
  let done = false;
  res.on('close', () => {
    if (done) return;
    done = true;
    inFlight -= 1;
    record(stress, res.statusCode, performance.now() - started);
  });
  next();
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  // A copy sorted as a statement — the server's lib is ES2022, no `toSorted` (S4043).
  const sorted = [...values];
  sorted.sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function prune(nowMs: number): void {
  const cutoff = nowMs - ACTIVE_WINDOW_MS;
  for (const [key, seen] of users) {
    if (seen.at < cutoff) users.delete(key);
  }
  for (const [key, at] of visitors) {
    if (at < cutoff) visitors.delete(key);
  }
}

function tick(): void {
  const now = cpuTotals();
  const total = now.total - lastCpu.total;
  const idle = now.idle - lastCpu.idle;
  ticked.cpuPct = total > 0 ? Math.round((1 - idle / total) * 100) : 0;
  lastCpu = now;
  // The histogram reports nanoseconds; the resolution itself is baseline delay.
  ticked.lagMs = Math.max(0, loopDelay.mean / 1e6 - 20);
  ticked.lagP99Ms = Math.max(0, loopDelay.percentile(99) / 1e6 - 20);
  loopDelay.reset();
  windowed.cpuSum += ticked.cpuPct;
  windowed.cpuTicks += 1;
  windowed.cpuMax = Math.max(windowed.cpuMax, ticked.cpuPct);
  windowed.lagP99Max = Math.max(windowed.lagP99Max, ticked.lagP99Ms);
  prune(Date.now());
}

function socketCount(): number {
  try {
    return getIo().engine.clientsCount;
  } catch {
    // Socket server not initialised (tests, a boot still in progress).
    return 0;
  }
}

function usersBySurface(): Array<{ surface: string; users: number }> {
  const counts = new Map<string, number>();
  for (const seen of users.values()) {
    counts.set(seen.surface, (counts.get(seen.surface) ?? 0) + 1);
  }
  const rows = [...counts.entries()].map(([surface, count]) => ({ surface, users: count }));
  rows.sort((a, b) => b.users - a.users);
  return rows;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The pulse right now. Its shape is the GraphQL `ServerPulse` type (stressTest.schema). */
export function readServerPulse() {
  const nowMs = Date.now();
  const currentSecond = Math.floor(nowMs / 1000);
  let requests = 0;
  let stress = 0;
  let errors5xx = 0;
  const latencies: number[] = [];
  // The window ends at the last COMPLETE second, so a half-filled current
  // second does not drag the rate down.
  for (const bucket of ring) {
    const age = currentSecond - bucket.second;
    if (age < 1 || age > RATE_WINDOW_SECONDS) continue;
    requests += bucket.requests;
    stress += bucket.stress;
    errors5xx += bucket.errors5xx;
    latencies.push(...bucket.latencies);
  }
  const memory = process.memoryUsage();
  const [load1 = 0] = os.loadavg();
  return {
    at: new Date(nowMs).toISOString(),
    host_cpu_pct: ticked.cpuPct,
    host_memory_pct: buildMemory().usagePercent,
    load_avg_1: round1(load1),
    event_loop_lag_ms: round1(ticked.lagMs),
    event_loop_p99_ms: round1(ticked.lagP99Ms),
    heap_used_mb: Math.round(memory.heapUsed / 1_048_576),
    rss_mb: Math.round(memory.rss / 1_048_576),
    rps_total: round1(requests / RATE_WINDOW_SECONDS),
    rps_stress: round1(stress / RATE_WINDOW_SECONDS),
    in_flight: Math.max(0, inFlight),
    server_p95_ms: Math.round(percentile(latencies, 95)),
    status_5xx: errors5xx,
    sockets: socketCount(),
    real_users: users.size,
    visitors: visitors.size,
    users_by_surface: usersBySurface(),
    uptime_seconds: Math.round(process.uptime()),
  };
}

/**
 * Everything counted since the last drain, then a fresh window. CPU is the
 * average (and worst) of the five-second ticks inside it, so a sample taken
 * every few minutes still sees a spike that lasted seconds.
 */
export function drainPulseWindow() {
  const drained = {
    requests: windowed.requests,
    errors_5xx: windowed.errors5xx,
    latency_avg_ms: windowed.requests > 0 ? round1(windowed.totalMs / windowed.requests) : 0,
    latency_p95_ms: Math.round(percentile(windowed.latencies, 95)),
    latency_max_ms: Math.round(windowed.maxMs),
    cpu_avg_pct: windowed.cpuTicks > 0 ? round1(windowed.cpuSum / windowed.cpuTicks) : ticked.cpuPct,
    cpu_peak_pct: windowed.cpuTicks > 0 ? windowed.cpuMax : ticked.cpuPct,
    event_loop_p99_ms: round1(windowed.lagP99Max),
  };
  Object.assign(windowed, {
    requests: 0,
    errors5xx: 0,
    totalMs: 0,
    maxMs: 0,
    latencies: [],
    cpuSum: 0,
    cpuTicks: 0,
    cpuMax: 0,
    lagP99Max: 0,
  });
  return drained;
}

/** Start the five-second tick. Returns a stop function. No-ops under NODE_ENV=test. */
export function startServerPulse(): () => void {
  if (process.env.NODE_ENV === 'test' || timer) return () => undefined;
  loopDelay.enable();
  timer = setInterval(tick, TICK_MS);
  timer.unref?.();
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    loopDelay.disable();
  };
}
