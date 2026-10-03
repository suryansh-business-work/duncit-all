/**
 * The server's live pulse: per-second request counting, who is behind the
 * traffic, the five-second CPU / event-loop tick and the history window the
 * Server Info sampler drains. Every reading from the host (os, perf_hooks, the
 * CPU counters, the socket server, the request identity) is faked, and each
 * test loads a fresh copy of the module so its counters start at zero.
 */
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';

const mockState = {
  cpu: { idle: 0, total: 0 },
  memoryPct: 50,
  load: [1.234, 0.5, 0.25] as number[],
  identity: undefined as Record<string, unknown> | undefined,
  stress: false,
  perfNow: 0,
  sockets: 7 as number | Error,
  nextRandom: (_max: number) => 0,
};
const mockHistogram = {
  mean: 0,
  percentile: jest.fn((_p: number) => 0),
  reset: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
};

jest.mock('node:os', () => ({ loadavg: () => mockState.load }));
jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomInt: (max: number) => mockState.nextRandom(max),
}));
jest.mock('node:perf_hooks', () => ({
  monitorEventLoopDelay: () => mockHistogram,
  performance: { now: () => mockState.perfNow },
}));
jest.mock('../../requestIdentity', () => ({ requestIdentity: { current: () => mockState.identity } }));
jest.mock('../../../realtime/io', () => ({
  getIo: () => {
    if (mockState.sockets instanceof Error) throw mockState.sockets;
    return { engine: { clientsCount: mockState.sockets } };
  },
}));
jest.mock('../../../modules/platform/tech/tech.service', () => ({
  cpuTotals: () => mockState.cpu,
  buildMemory: () => ({ usagePercent: mockState.memoryPct }),
}));
jest.mock('../../../modules/platform/stressTest/stressTest.traffic', () => ({
  isStressTraffic: () => mockState.stress,
}));

type PulseModule = typeof import('../../serverPulse');

/** A fresh module: zeroed ring, maps, window and tick readings. */
function load(): PulseModule {
  let mod: PulseModule | undefined;
  jest.isolateModules(() => {
    mod = require('../../serverPulse') as PulseModule;
  });
  return mod as PulseModule;
}

const T0 = Date.parse('2026-09-01T10:00:00.000Z');
const at = (ms: number) => jest.setSystemTime(T0 + ms);

/** One request through the middleware that takes `ms` and ends with `status`. */
function serve(pulse: PulseModule, { status = 200, ms = 10, close = true } = {}) {
  const res = Object.assign(new EventEmitter(), { statusCode: status }) as unknown as Response & EventEmitter;
  const next = jest.fn() as NextFunction;
  mockState.perfNow = 1_000;
  pulse.serverPulseMiddleware({} as Request, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  mockState.perfNow = 1_000 + ms;
  if (close) res.emit('close');
  return res;
}

const originalEnv = process.env.NODE_ENV;

beforeEach(() => {
  jest.useFakeTimers();
  at(0);
  Object.assign(mockState, {
    cpu: { idle: 0, total: 0 },
    memoryPct: 50,
    load: [1.234, 0.5, 0.25],
    identity: undefined,
    stress: false,
    perfNow: 0,
    sockets: 7,
    nextRandom: () => 0,
  });
  mockHistogram.mean = 0;
  mockHistogram.percentile.mockReturnValue(0);
  jest.spyOn(process, 'memoryUsage').mockReturnValue({
    rss: 200 * 1_048_576,
    heapTotal: 0,
    heapUsed: 50 * 1_048_576,
    external: 0,
    arrayBuffers: 0,
  });
  jest.spyOn(process, 'uptime').mockReturnValue(123.4);
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('readServerPulse', () => {
  it('reads an idle server', () => {
    const pulse = load();
    expect(pulse.readServerPulse()).toEqual({
      at: '2026-09-01T10:00:00.000Z',
      host_cpu_pct: 0,
      host_memory_pct: 50,
      load_avg_1: 1.2,
      event_loop_lag_ms: 0,
      event_loop_p99_ms: 0,
      heap_used_mb: 50,
      rss_mb: 200,
      rps_total: 0,
      rps_stress: 0,
      in_flight: 0,
      server_p95_ms: 0,
      status_5xx: 0,
      sockets: 7,
      real_users: 0,
      visitors: 0,
      users_by_surface: [],
      uptime_seconds: 123,
    });
  });

  it('reads zero sockets before the socket server exists, and zero load where the OS gives none', () => {
    mockState.sockets = new Error('Socket.io not initialised');
    mockState.load = [];
    const reading = load().readServerPulse();
    expect(reading.sockets).toBe(0);
    expect(reading.load_avg_1).toBe(0);
  });
});

describe('serverPulseMiddleware — request counting', () => {
  it('counts the last ten complete seconds, stress and 5xx separately, and reads p95 off them', () => {
    const pulse = load();
    at(500);
    serve(pulse, { ms: 10 });
    serve(pulse, { status: 503, ms: 30 });
    mockState.stress = true;
    serve(pulse, { ms: 5 });

    // Still inside the same second: a half-filled second is not counted yet.
    expect(pulse.readServerPulse()).toMatchObject({ rps_total: 0, status_5xx: 0 });

    at(1_500);
    expect(pulse.readServerPulse()).toMatchObject({
      rps_total: 0.3,
      rps_stress: 0.1,
      status_5xx: 1,
      server_p95_ms: 30,
      in_flight: 0,
    });

    // Eleven seconds on the second has aged out of the window.
    at(11_500);
    expect(pulse.readServerPulse()).toMatchObject({ rps_total: 0, server_p95_ms: 0 });
  });

  it('holds a request in flight until its response closes, and counts a double close once', () => {
    const pulse = load();
    const res = serve(pulse, { close: false });
    expect(pulse.readServerPulse().in_flight).toBe(1);
    res.emit('close');
    res.emit('close');
    at(1_000);
    expect(pulse.readServerPulse()).toMatchObject({ in_flight: 0, rps_total: 0.1 });
  });

  it('starts a reused ring slot from zero a minute later', () => {
    const pulse = load();
    serve(pulse);
    serve(pulse);
    at(60_000);
    serve(pulse);
    at(61_000);
    expect(pulse.readServerPulse().rps_total).toBe(0.1);
  });

  it('samples a busy second with a reservoir so later requests still count toward p95', () => {
    const pulse = load();
    for (let i = 0; i < 200; i += 1) serve(pulse, { ms: 1 });
    let slot = 0;
    mockState.nextRandom = () => slot++;
    for (let i = 0; i < 15; i += 1) serve(pulse, { ms: 1_000 });
    // A draw past the reservoir keeps the sample as it is.
    mockState.nextRandom = (max) => max - 1;
    serve(pulse, { ms: 5_000 });
    at(1_000);
    // 185 fast + 15 slow of 200 samples: the 190th fastest is slow.
    expect(pulse.readServerPulse()).toMatchObject({ server_p95_ms: 1_000, rps_total: 21.6 });
  });
});

describe('serverPulseMiddleware — who is calling', () => {
  it('counts signed-in users by surface, busiest surface first', () => {
    const pulse = load();
    mockState.identity = { user: { id: 'u1' }, surface: 'MWEB' };
    serve(pulse);
    mockState.identity = { user: { id: 'u2' }, surface: 'NATIVE' };
    serve(pulse);
    mockState.identity = { user: { id: 'u3' }, surface: 'NATIVE' };
    serve(pulse);
    mockState.identity = { user: { id: 'u3' }, surface: 'NATIVE' };
    serve(pulse);
    mockState.identity = { user: { id: 'u4' } };
    serve(pulse);

    const reading = pulse.readServerPulse();
    expect(reading.real_users).toBe(4);
    expect(reading.visitors).toBe(0);
    expect(reading.users_by_surface).toEqual([
      { surface: 'NATIVE', users: 2 },
      { surface: 'MWEB', users: 1 },
      { surface: 'OTHER', users: 1 },
    ]);
  });

  it('counts anonymous visitors by device id, else by address', () => {
    const pulse = load();
    mockState.identity = { duid: 'device-1', ip: '203.0.113.5' };
    serve(pulse);
    mockState.identity = { duid: 'device-1', ip: '203.0.113.6' };
    serve(pulse);
    mockState.identity = { ip: '203.0.113.7' };
    serve(pulse);
    expect(pulse.readServerPulse()).toMatchObject({ visitors: 2, real_users: 0 });
  });

  it('ignores callers it cannot attribute: no identity, no key, a stress bot or stress traffic', () => {
    const pulse = load();
    mockState.identity = undefined;
    serve(pulse);
    mockState.identity = { user_agent: 'Mozilla/5.0' };
    serve(pulse);
    mockState.identity = { user: { id: 'bot' }, user_agent: 'Mozilla/5.0 DuncitStressBot/1', ip: '203.0.113.9' };
    serve(pulse);
    mockState.identity = { user: { id: 'u1' } };
    mockState.stress = true;
    serve(pulse);
    expect(pulse.readServerPulse()).toMatchObject({ visitors: 0, real_users: 0 });
  });

  it('stops tracking new visitors at 50,000 but keeps refreshing known ones', () => {
    const pulse = load();
    // Responses that never close: only the caller bookkeeping is under test here.
    const res = { statusCode: 200, on: () => undefined } as unknown as Response;
    const next = () => undefined;
    for (let i = 0; i < 50_000; i += 1) {
      mockState.identity = { duid: `d-${i}` };
      pulse.serverPulseMiddleware({} as Request, res, next);
    }
    mockState.identity = { duid: 'd-new' };
    pulse.serverPulseMiddleware({} as Request, res, next);
    mockState.identity = { duid: 'd-0' };
    pulse.serverPulseMiddleware({} as Request, res, next);
    expect(pulse.readServerPulse().visitors).toBe(50_000);
  });
});

describe('startServerPulse and the five-second tick', () => {
  it('does nothing under NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const pulse = load();
    const stop = pulse.startServerPulse();
    jest.advanceTimersByTime(10_000);
    expect(mockHistogram.enable).not.toHaveBeenCalled();
    expect(mockHistogram.reset).not.toHaveBeenCalled();
    stop();
    expect(mockHistogram.disable).not.toHaveBeenCalled();
  });

  it('reads host CPU and event-loop delay every five seconds, net of the histogram resolution', () => {
    process.env.NODE_ENV = 'development';
    mockState.cpu = { idle: 100, total: 500 };
    const pulse = load();
    const stop = pulse.startServerPulse();
    expect(mockHistogram.enable).toHaveBeenCalledTimes(1);
    // A second start while one is running is a no-op.
    pulse.startServerPulse()();
    expect(mockHistogram.disable).not.toHaveBeenCalled();

    mockState.cpu = { idle: 150, total: 1_000 };
    mockHistogram.mean = 25e6;
    mockHistogram.percentile.mockReturnValue(45.04e6);
    jest.advanceTimersByTime(5_000);

    expect(mockHistogram.percentile).toHaveBeenCalledWith(99);
    expect(mockHistogram.reset).toHaveBeenCalledTimes(1);
    expect(pulse.readServerPulse()).toMatchObject({ host_cpu_pct: 90, event_loop_lag_ms: 5, event_loop_p99_ms: 25 });

    // No CPU time passed and a delay under the baseline: both read zero.
    mockHistogram.mean = 10e6;
    mockHistogram.percentile.mockReturnValue(15e6);
    jest.advanceTimersByTime(5_000);
    expect(pulse.readServerPulse()).toMatchObject({ host_cpu_pct: 0, event_loop_lag_ms: 0, event_loop_p99_ms: 0 });

    stop();
    expect(mockHistogram.disable).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(10_000);
    expect(mockHistogram.reset).toHaveBeenCalledTimes(2);
    // Stopping twice is harmless.
    stop();
    expect(mockHistogram.disable).toHaveBeenCalledTimes(2);
  });

  it('forgets users and visitors not seen for a minute', () => {
    process.env.NODE_ENV = 'development';
    const pulse = load();
    const stop = pulse.startServerPulse();
    mockState.identity = { user: { id: 'u1' }, surface: 'MWEB' };
    serve(pulse);
    mockState.identity = { duid: 'device-1' };
    serve(pulse);

    at(30_000);
    mockState.identity = { duid: 'device-2' };
    serve(pulse);

    at(61_000);
    jest.advanceTimersByTime(5_000);
    expect(pulse.readServerPulse()).toMatchObject({ real_users: 0, visitors: 1 });
    stop();
  });
});

describe('drainPulseWindow', () => {
  it('reports an empty window with the current CPU reading when no tick has run', () => {
    const pulse = load();
    expect(pulse.drainPulseWindow()).toEqual({
      requests: 0,
      errors_5xx: 0,
      latency_avg_ms: 0,
      latency_p95_ms: 0,
      latency_max_ms: 0,
      cpu_avg_pct: 0,
      cpu_peak_pct: 0,
      event_loop_p99_ms: 0,
    });
  });

  it('summarises real traffic and every tick since the last drain, then starts a fresh window', () => {
    process.env.NODE_ENV = 'development';
    mockState.cpu = { idle: 0, total: 0 };
    const pulse = load();
    const stop = pulse.startServerPulse();

    serve(pulse, { ms: 10 });
    serve(pulse, { status: 500, ms: 25 });
    mockState.stress = true;
    serve(pulse, { ms: 900 });
    mockState.stress = false;

    mockState.cpu = { idle: 60, total: 100 };
    mockHistogram.percentile.mockReturnValue(30e6);
    jest.advanceTimersByTime(5_000);
    mockState.cpu = { idle: 140, total: 200 };
    mockHistogram.percentile.mockReturnValue(22e6);
    jest.advanceTimersByTime(5_000);

    expect(pulse.drainPulseWindow()).toEqual({
      requests: 2,
      errors_5xx: 1,
      latency_avg_ms: 17.5,
      latency_p95_ms: 25,
      latency_max_ms: 25,
      cpu_avg_pct: 30,
      cpu_peak_pct: 40,
      event_loop_p99_ms: 10,
    });
    expect(pulse.drainPulseWindow()).toMatchObject({ requests: 0, latency_max_ms: 0, cpu_avg_pct: 20, cpu_peak_pct: 20 });
    stop();
  });

  it('keeps a bounded latency reservoir for a long window', () => {
    const pulse = load();
    for (let i = 0; i < 2_000; i += 1) {
      // Spread over seconds so only the window reservoir fills.
      if (i % 200 === 0) at(i * 5);
      serve(pulse, { ms: 1 });
    }
    let slot = 0;
    mockState.nextRandom = () => slot++;
    at(20_000);
    for (let i = 0; i < 150; i += 1) serve(pulse, { ms: 1_000 });
    mockState.nextRandom = (max) => max - 1;
    serve(pulse, { ms: 3_000 });

    expect(pulse.drainPulseWindow()).toMatchObject({
      requests: 2_151,
      latency_p95_ms: 1_000,
      latency_max_ms: 3_000,
    });
  });
});
