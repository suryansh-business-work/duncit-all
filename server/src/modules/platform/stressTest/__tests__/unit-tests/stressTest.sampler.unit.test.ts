/**
 * The stress sampler's five-second heartbeat: sampling, guardrails and the
 * sweep that closes runs nobody is driving. Every collaborator is mocked; the
 * tick is driven through startStressTestSampler with fake timers.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } },
}));
jest.mock('@observability/serverPulse', () => ({ readServerPulse: jest.fn() }));
jest.mock('../../stressTest.model', () => ({
  LIVE_STATUSES: ['QUEUED', 'RUNNING', 'STOPPING'],
  StressRunModel: { find: jest.fn(), updateOne: jest.fn() },
  StressSampleModel: { create: jest.fn() },
}));
jest.mock('../../stressTest.traffic', () => ({ setActiveTrafficKeys: jest.fn() }));
jest.mock('../../stressTest.live', () => ({ mergeLoad: jest.fn() }));
jest.mock('../../stressTest.containers', () => ({ sampleContainers: jest.fn() }));
jest.mock('../../stressTest.records', () => ({
  appendEvent: jest.fn(),
  endRun: jest.fn(),
  finaliseRun: jest.fn(),
  settingsDoc: jest.fn(),
}));
jest.mock('../../stressTest.service', () => ({ cancelRunWorkflow: jest.fn() }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { readServerPulse } from '@observability/serverPulse';
import { StressRunModel, StressSampleModel } from '../../stressTest.model';
import { setActiveTrafficKeys } from '../../stressTest.traffic';
import { mergeLoad } from '../../stressTest.live';
import { sampleContainers } from '../../stressTest.containers';
import { appendEvent, endRun, finaliseRun, settingsDoc } from '../../stressTest.records';
import { cancelRunWorkflow } from '../../stressTest.service';
import { startStressTestSampler } from '../../stressTest.sampler';

const find = StressRunModel.find as jest.Mock;
const updateOne = StressRunModel.updateOne as jest.Mock;
const createSample = StressSampleModel.create as jest.Mock;

const SETTINGS = {
  abort_error_rate_pct: 25,
  abort_p95_ms: 8000,
  abort_host_cpu_pct: 95,
  abort_host_memory_pct: 95,
  abort_breach_samples: 2,
  sample_retention_days: 7,
};

const PULSE = {
  host_cpu_pct: 40,
  host_memory_pct: 50,
  load_avg_1: 1.2,
  event_loop_lag_ms: 3,
  heap_used_mb: 120,
  rss_mb: 300,
  rps_total: 12,
  rps_stress: 10,
  in_flight: 4,
  server_p95_ms: 90,
  status_5xx: 0,
  sockets: 6,
  real_users: 2,
  visitors: 5,
  // Fields the pulse carries that a stress sample does not keep.
  at: '2026-09-01T10:00:00.000Z',
  users_by_surface: [],
};

const LOAD = {
  active_vus: 20,
  active_bots: 1,
  rps: 10,
  error_rate_pct: 0,
  p50_ms: 50,
  p95_ms: 200,
  p99_ms: 400,
  requests: 50,
  errors: 0,
  navigations: 2,
  page_load_ms: 900,
  status_counts: { '200': 50 },
};

const CONTAINERS = [{ name: 'api', cpu_pct: 30, memory_mb: 256, memory_pct: 12 }];

const ago = (ms: number) => new Date(Date.now() - ms);

const makeRun = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  run_no: 'DUN-STR-000042',
  status: 'RUNNING',
  traffic_key_hash: 'hash-42',
  created_at: ago(60_000),
  started_at: ago(30_000),
  last_report_at: ago(1_000),
  stop_requested_at: null,
  stop_reason: '',
  terminated: false,
  shard_results: [],
  profile: { ramp_up_seconds: 60, hold_seconds: 300, ramp_down_seconds: 30, runners: 2 },
  ...overrides,
});

/** Let the tick's promise chain run to completion (every mock resolves at once). */
const flush = async () => {
  for (let i = 0; i < 300; i += 1) await Promise.resolve();
};

let stop: () => void = () => undefined;
const originalEnv = process.env.NODE_ENV;

const tick = async () => {
  jest.advanceTimersByTime(5_000);
  await flush();
};

/** The updateOne a stop request writes — guarded on RUNNING. */
const stopWrites = () => updateOne.mock.calls.filter(([filter]) => filter.status === 'RUNNING');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-01T10:00:00Z'));
  process.env.NODE_ENV = 'development';
  (readServerPulse as jest.Mock).mockReturnValue({ ...PULSE });
  (settingsDoc as jest.Mock).mockResolvedValue({ ...SETTINGS });
  (mergeLoad as jest.Mock).mockReturnValue({ ...LOAD });
  (sampleContainers as jest.Mock).mockResolvedValue(CONTAINERS);
  (endRun as jest.Mock).mockResolvedValue(true);
  (finaliseRun as jest.Mock).mockResolvedValue(undefined);
  (appendEvent as jest.Mock).mockResolvedValue(undefined);
  (cancelRunWorkflow as jest.Mock).mockResolvedValue(undefined);
  createSample.mockResolvedValue({});
  updateOne.mockResolvedValue({ modifiedCount: 1 });
  find.mockResolvedValue([]);
});

afterEach(() => {
  stop();
  stop = () => undefined;
  process.env.NODE_ENV = originalEnv;
  jest.useRealTimers();
});

const start = () => {
  stop = startStressTestSampler();
};

describe('startStressTestSampler', () => {
  it('never ticks under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    start();
    await tick();
    expect(find).not.toHaveBeenCalled();
  });

  it('ticks every five seconds and stops when asked', async () => {
    start();
    jest.advanceTimersByTime(4_999);
    await flush();
    expect(find).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flush();
    expect(find).toHaveBeenCalledWith({ status: { $in: ['QUEUED', 'RUNNING', 'STOPPING'] } });

    stop();
    await tick();
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('never stacks a second tick on one still in progress', async () => {
    let release: (v: unknown[]) => void = () => undefined;
    find.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    start();
    await tick();
    await tick();
    expect(find).toHaveBeenCalledTimes(1);

    release([]);
    await flush();
    await tick();
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('logs a failed tick and keeps ticking', async () => {
    const boom = new Error('mongo down');
    find.mockRejectedValueOnce(boom);
    start();
    await tick();
    expect(logs.server.error).toHaveBeenCalledWith('stressTest', 'sampler', { error: boom });
    await tick();
    expect(find).toHaveBeenCalledTimes(2);
  });
});

describe('a tick with nothing live', () => {
  it('clears the accepted traffic keys and reads nothing else', async () => {
    start();
    await tick();
    expect(setActiveTrafficKeys).toHaveBeenCalledWith([]);
    expect(settingsDoc).not.toHaveBeenCalled();
    expect(readServerPulse).not.toHaveBeenCalled();
  });
});

describe('queued runs', () => {
  it('accept the run traffic key but are neither sampled nor containers read', async () => {
    find.mockResolvedValue([makeRun({ status: 'QUEUED', created_at: ago(60_000), last_report_at: null })]);
    start();
    await tick();
    expect(setActiveTrafficKeys).toHaveBeenCalledWith(['hash-42']);
    expect(sampleContainers).not.toHaveBeenCalled();
    expect(createSample).not.toHaveBeenCalled();
    expect(endRun).not.toHaveBeenCalled();
  });

  it('fail when no runner claims them within 20 minutes', async () => {
    const run = makeRun({ status: 'QUEUED', created_at: ago(20 * 60_000 + 6_000), last_report_at: null });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(endRun).toHaveBeenCalledWith(run, 'FAILED', 'No GitHub runner picked the run up within 20 minutes.');
    expect(createSample).not.toHaveBeenCalled();
  });
});

describe('sampling a running run', () => {
  it('stores one sample of load, server and containers, and raises the peaks', async () => {
    const run = makeRun();
    find.mockResolvedValue([run]);
    start();
    await tick();

    expect(mergeLoad).toHaveBeenCalledWith(run._id.toHexString());
    const doc = createSample.mock.calls[0][0];
    expect(doc.run_id).toBe(run._id);
    expect(doc.load).toEqual(LOAD);
    expect(doc.containers).toEqual(CONTAINERS);
    expect(doc.server).toEqual({
      host_cpu_pct: 40,
      host_memory_pct: 50,
      load_avg_1: 1.2,
      event_loop_lag_ms: 3,
      heap_used_mb: 120,
      rss_mb: 300,
      rps_total: 12,
      rps_stress: 10,
      in_flight: 4,
      server_p95_ms: 90,
      status_5xx: 0,
      sockets: 6,
      real_users: 2,
      visitors: 5,
    });
    expect(doc.expires_at.getTime() - doc.at.getTime()).toBe(7 * 86_400_000);

    expect(updateOne).toHaveBeenCalledWith(
      { _id: run._id },
      {
        $max: {
          'peaks.virtual_users': 20,
          'peaks.browser_bots': 1,
          'peaks.rps': 10,
          'peaks.p95_ms': 200,
          'peaks.error_rate_pct': 0,
          'peaks.host_cpu_pct': 40,
          'peaks.host_memory_pct': 50,
          'peaks.event_loop_lag_ms': 3,
          'peaks.real_users': 2,
        },
      }
    );
    expect(stopWrites()).toHaveLength(0);
  });

  it('samples a stopping run but does not apply guardrails to it', async () => {
    (readServerPulse as jest.Mock).mockReturnValue({ ...PULSE, host_memory_pct: 99 });
    find.mockResolvedValue([makeRun({ status: 'STOPPING', stop_requested_at: ago(10_000) })]);
    start();
    await tick();
    expect(createSample).toHaveBeenCalledTimes(1);
    expect(stopWrites()).toHaveLength(0);
  });
});

describe('guardrails', () => {
  it('terminates on one sample of exhausted host memory', async () => {
    (readServerPulse as jest.Mock).mockReturnValue({ ...PULSE, host_memory_pct: 96, host_cpu_pct: 99 });
    const run = makeRun();
    find.mockResolvedValue([run]);
    start();
    await tick();

    const [[filter, update]] = stopWrites();
    expect(filter).toEqual({ _id: run._id, status: 'RUNNING' });
    expect(update.$set).toMatchObject({
      status: 'STOPPING',
      stop_reason: 'Terminated — host memory 96% ≥ 95%',
      terminated: true,
    });
    expect(appendEvent).toHaveBeenCalledWith(run._id, 'ERROR', 'guardrail', 'Terminating: Terminated — host memory 96% ≥ 95%.');
    expect(logs.server.warn).toHaveBeenCalledWith('stressTest', 'guardrail', {
      run_no: run.run_no,
      reason: 'Terminated — host memory 96% ≥ 95%',
      terminated: true,
    });
  });

  it('terminates on exhausted host CPU', async () => {
    (readServerPulse as jest.Mock).mockReturnValue({ ...PULSE, host_cpu_pct: 95 });
    find.mockResolvedValue([makeRun()]);
    start();
    await tick();
    expect(stopWrites()[0][1].$set.stop_reason).toBe('Terminated — host CPU 95% ≥ 95%');
  });

  it('writes no timeline line when the run already left RUNNING', async () => {
    (readServerPulse as jest.Mock).mockReturnValue({ ...PULSE, host_cpu_pct: 100 });
    updateOne.mockImplementation(async (filter) => ({ modifiedCount: filter.status === 'RUNNING' ? 0 : 1 }));
    find.mockResolvedValue([makeRun()]);
    start();
    await tick();
    expect(stopWrites()).toHaveLength(1);
    expect(appendEvent).not.toHaveBeenCalled();
    expect(logs.server.warn).not.toHaveBeenCalled();
  });

  it('trips a latency breach only once it persists for the configured samples', async () => {
    (mergeLoad as jest.Mock).mockReturnValue({ ...LOAD, p95_ms: 9000 });
    const run = makeRun();
    find.mockResolvedValue([run]);
    start();

    await tick();
    expect(stopWrites()).toHaveLength(0);

    await tick();
    const [[, update]] = stopWrites();
    expect(update.$set).toMatchObject({ stop_reason: 'Guardrail tripped — p95 latency 9000 ms ≥ 8000 ms', terminated: false });
    expect(appendEvent).toHaveBeenCalledWith(run._id, 'WARN', 'guardrail', 'Stopping: Guardrail tripped — p95 latency 9000 ms ≥ 8000 ms.');
  });

  it('trips an error-rate breach once the window has enough requests', async () => {
    (mergeLoad as jest.Mock).mockReturnValue({ ...LOAD, requests: 20, error_rate_pct: 30 });
    find.mockResolvedValue([makeRun()]);
    start();
    await tick();
    await tick();
    expect(stopWrites()[0][1].$set.stop_reason).toBe('Guardrail tripped — error rate 30% ≥ 25%');
  });

  it('ignores an error rate read off fewer than 20 requests', async () => {
    (mergeLoad as jest.Mock).mockReturnValue({ ...LOAD, requests: 19, error_rate_pct: 100 });
    find.mockResolvedValue([makeRun()]);
    start();
    await tick();
    await tick();
    await tick();
    expect(stopWrites()).toHaveLength(0);
  });

  it('resets the streak after a clean sample', async () => {
    const merge = mergeLoad as jest.Mock;
    merge
      .mockReturnValueOnce({ ...LOAD, p95_ms: 9000 })
      .mockReturnValueOnce({ ...LOAD })
      .mockReturnValueOnce({ ...LOAD, p95_ms: 9000 });
    find.mockResolvedValue([makeRun()]);
    start();
    await tick();
    await tick();
    await tick();
    expect(stopWrites()).toHaveLength(0);
  });

  it('stops a run that went past its planned duration plus grace', async () => {
    // Planned 60 + 300 + 30 = 390 s, grace three minutes.
    const run = makeRun({ started_at: ago((390 + 180) * 1000 - 4_000) });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(stopWrites()[0][1].$set.stop_reason).toBe('The run went past its planned duration');
  });

  it('lets a run inside its planned duration keep going', async () => {
    find.mockResolvedValue([makeRun({ started_at: ago(390_000) })]);
    start();
    await tick();
    expect(stopWrites()).toHaveLength(0);
  });
});

describe('sweeping abandoned runs', () => {
  it('aborts a stop the runners ignored for two minutes, cancelling the workflow first', async () => {
    const run = makeRun({ status: 'STOPPING', stop_requested_at: ago(2 * 60_000), stop_reason: 'Stopped by ops@example.com' });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(cancelRunWorkflow).toHaveBeenCalledWith(run);
    expect(endRun).toHaveBeenCalledWith(run, 'ABORTED', 'Stopped by ops@example.com — the runners did not acknowledge in time.');
    expect(createSample).not.toHaveBeenCalled();
  });

  it('names an unexplained stop simply "Stopped"', async () => {
    const run = makeRun({ status: 'STOPPING', stop_requested_at: ago(3 * 60_000), stop_reason: '' });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(endRun).toHaveBeenCalledWith(run, 'ABORTED', 'Stopped — the runners did not acknowledge in time.');
  });

  it('gives a terminated run only thirty seconds to stop', async () => {
    const terminated = makeRun({ status: 'STOPPING', terminated: true, stop_requested_at: ago(26_000), stop_reason: 'Terminated — host CPU' });
    const patient = makeRun({ status: 'STOPPING', terminated: false, stop_requested_at: ago(26_000) });
    find.mockResolvedValue([terminated, patient]);
    start();
    await tick();
    expect(endRun).toHaveBeenCalledTimes(1);
    expect(endRun).toHaveBeenCalledWith(terminated, 'ABORTED', 'Terminated — host CPU — the runners did not acknowledge in time.');
    expect(createSample).toHaveBeenCalledTimes(1);
  });

  it('fails a run whose runners went silent for three minutes', async () => {
    const run = makeRun({ last_report_at: ago(3 * 60_000) });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(endRun).toHaveBeenCalledWith(run, 'FAILED', 'The runners stopped reporting for three minutes.');
  });

  it('closes on the partial results when some shards did report back', async () => {
    const run = makeRun({ last_report_at: ago(4 * 60_000), shard_results: [{ shard: 0 }] });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(endRun).not.toHaveBeenCalled();
    expect(appendEvent).toHaveBeenCalledWith(
      run._id,
      'WARN',
      'server',
      'The runners stopped reporting for three minutes. Only 1 of 2 runners reported back; closing the run on their results.'
    );
    expect(finaliseRun).toHaveBeenCalledWith(run);
  });

  it('treats a missing shard list as no shard reported', async () => {
    const run = makeRun({ last_report_at: ago(4 * 60_000), shard_results: undefined });
    find.mockResolvedValue([run]);
    start();
    await tick();
    expect(endRun).toHaveBeenCalledWith(run, 'FAILED', 'The runners stopped reporting for three minutes.');
    expect(finaliseRun).not.toHaveBeenCalled();
  });

  it('moves on to the next run after closing one', async () => {
    const dead = makeRun({ last_report_at: ago(4 * 60_000) });
    const healthy = makeRun({ run_no: 'DUN-STR-000043', traffic_key_hash: 'hash-43' });
    find.mockResolvedValue([dead, healthy]);
    start();
    await tick();
    expect(setActiveTrafficKeys).toHaveBeenCalledWith(['hash-42', 'hash-43']);
    expect(endRun).toHaveBeenCalledWith(dead, 'FAILED', expect.any(String));
    expect(createSample).toHaveBeenCalledTimes(1);
    expect(createSample.mock.calls[0][0].run_id).toBe(healthy._id);
  });
});
