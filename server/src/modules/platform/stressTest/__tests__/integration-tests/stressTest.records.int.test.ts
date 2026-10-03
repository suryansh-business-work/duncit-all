/**
 * stressTest.records — the settings singleton, the public shapes, the run log
 * and the two ways a run closes, against a real database.
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  STRESS_SETTINGS_KEY,
  StressRunModel,
  StressSettingsModel,
  type IStressEndpoint,
  type IStressRun,
  type IStressSample,
  type IStressSettings,
  type IStressShardResult,
  type IStressSummary,
} from '../../stressTest.model';
import { liveShards, noteShardReport, type StressShardReport } from '../../stressTest.live';
import {
  appendEvent,
  endRun,
  finaliseRun,
  pubRun,
  pubSample,
  pubSettings,
  settingsDoc,
} from '../../stressTest.records';

let seq = 0;
const createRun = (overrides: Record<string, unknown> = {}) => {
  seq += 1;
  return StressRunModel.create({
    run_no: `DUN-STR-T${String(seq).padStart(5, '0')}`,
    status: 'RUNNING',
    environment: 'staging',
    target_mweb_url: 'https://staging.example.com',
    target_graphql_url: 'https://staging.api.example.com/graphql',
    profile: { virtual_users: 20, runners: 2, ramp_up_seconds: 10, hold_seconds: 60, ramp_down_seconds: 10 },
    ...overrides,
  });
};

const summary = (s: Partial<IStressSummary>): IStressSummary => ({
  requests: 0,
  errors: 0,
  error_rate_pct: 0,
  avg_rps: 0,
  avg_ms: 0,
  p50_ms: 0,
  p95_ms: 0,
  p99_ms: 0,
  navigations: 0,
  navigation_errors: 0,
  avg_page_load_ms: 0,
  ...s,
});

const endpoint = (e: Partial<IStressEndpoint> & { key: string }): IStressEndpoint => ({
  requests: 0,
  errors: 0,
  avg_ms: 0,
  p50_ms: 0,
  p95_ms: 0,
  p99_ms: 0,
  ...e,
});

const shard = (r: Partial<IStressShardResult> & { shard: number }): IStressShardResult => ({
  outcome: 'COMPLETED',
  error: '',
  summary: summary({}),
  endpoints: [],
  at: new Date(),
  ...r,
});

const fresh = async (id: Types.ObjectId) => (await StressRunModel.findById(id).lean()) as unknown as IStressRun;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('settingsDoc', () => {
  it('creates the singleton with the modest defaults on first read and reuses it after', async () => {
    const first = await settingsDoc();
    expect(first.key).toBe(STRESS_SETTINGS_KEY);
    expect(first.max_virtual_users).toBe(500);
    expect(first.abort_breach_samples).toBe(3);

    const second = await settingsDoc();
    expect(second._id.toString()).toBe(first._id.toString());
    expect(await StressSettingsModel.countDocuments()).toBe(1);
  });

  it('returns a stored ceiling unchanged rather than resetting it', async () => {
    await StressSettingsModel.create({ key: STRESS_SETTINGS_KEY, max_runners: 9 });
    expect((await settingsDoc()).max_runners).toBe(9);
  });
});

describe('pubSettings', () => {
  it('copies every limit and serialises updated_at as ISO', async () => {
    const doc = await settingsDoc();
    const out = pubSettings(doc);
    expect(out).toEqual({
      max_virtual_users: 500,
      max_browser_bots: 10,
      max_runners: 4,
      max_duration_minutes: 30,
      abort_error_rate_pct: 25,
      abort_p95_ms: 8000,
      abort_host_cpu_pct: 95,
      abort_host_memory_pct: 95,
      abort_breach_samples: 3,
      sample_retention_days: 30,
      updated_at: doc.updated_at.toISOString(),
    });
  });

  it('reports a null updated_at when the document has none', () => {
    const out = pubSettings({ max_virtual_users: 1 } as unknown as IStressSettings);
    expect(out.updated_at).toBeNull();
    expect(out.max_virtual_users).toBe(1);
  });
});

describe('pubRun', () => {
  it('shapes a queued run with empty defaults and no duration', async () => {
    const run = await createRun({ status: 'QUEUED' });
    const out = pubRun(run);
    expect(out).toMatchObject({
      id: run._id.toHexString(),
      run_no: run.run_no,
      status: 'QUEUED',
      triggered_by: '',
      workflow_run_url: '',
      ref: '',
      started_at: null,
      ended_at: null,
      stop_requested_at: null,
      stop_reason: '',
      terminated: false,
      last_report_at: null,
      duration_seconds: null,
      summary: null,
      endpoints: [],
      shards_finished: 0,
      events: [],
      error_message: '',
      verdict: null,
    });
    expect(out.created_at).toBe(run.created_at.toISOString());
  });

  it('measures a finished run from start to end and serialises events and the verdict', async () => {
    const started = new Date('2026-09-01T10:00:00.000Z');
    const ended = new Date('2026-09-01T10:01:40.400Z');
    const generated = new Date('2026-09-01T10:05:00.000Z');
    const run = await createRun({
      status: 'COMPLETED',
      started_at: started,
      ended_at: ended,
      events: [{ at: started, level: 'INFO', source: 'portal', message: 'Queued.' }],
      shard_results: [shard({ shard: 0 }), shard({ shard: 1 })],
      verdict: { grade: 'HEALTHY', headline: 'Fine', generated_at: generated },
    });
    const out = pubRun(run);
    expect(out.duration_seconds).toBe(100);
    expect(out.started_at).toBe(started.toISOString());
    expect(out.ended_at).toBe(ended.toISOString());
    expect(out.shards_finished).toBe(2);
    expect(out.events).toEqual([{ at: started.toISOString(), level: 'INFO', source: 'portal', message: 'Queued.' }]);
    expect(out.verdict).toEqual({ grade: 'HEALTHY', headline: 'Fine', generated_at: generated.toISOString() });
  });

  it('measures a live run up to now and never reports a negative duration', async () => {
    const live = await createRun({ started_at: new Date(Date.now() - 30_000) });
    expect(pubRun(live).duration_seconds).toBeGreaterThanOrEqual(30);

    const skewed = await createRun({ started_at: new Date('2026-09-01T10:00:10Z'), ended_at: new Date('2026-09-01T10:00:00Z') });
    expect(pubRun(skewed).duration_seconds).toBe(0);
  });

  it('falls back on every optional field a partial row lacks', () => {
    const _id = new Types.ObjectId();
    const out = pubRun({ _id, run_no: 'DUN-STR-X', status: 'FAILED' } as unknown as IStressRun);
    expect(out).toMatchObject({
      id: _id.toHexString(),
      triggered_by: '',
      stop_reason: '',
      terminated: false,
      summary: null,
      endpoints: [],
      shards_finished: 0,
      events: [],
      error_message: '',
      verdict: null,
      created_at: null,
    });
  });
});

describe('pubSample', () => {
  it('serialises the time and defaults missing containers to an empty list', () => {
    const at = new Date('2026-09-01T10:00:05Z');
    const load = { rps: 3 };
    const server = { host_cpu_pct: 40 };
    expect(pubSample({ at, load, server } as unknown as IStressSample)).toEqual({
      at: at.toISOString(),
      load,
      server,
      containers: [],
    });
    const containers = [{ name: 'api', cpu_pct: 1, memory_mb: 2, memory_pct: 3 }];
    expect(pubSample({ at, load, server, containers } as unknown as IStressSample).containers).toEqual(containers);
  });
});

describe('appendEvent', () => {
  it('pushes a line onto the run timeline', async () => {
    const run = await createRun();
    await appendEvent(run._id, 'WARN', 'guardrail', 'Stopping: p95.');
    await appendEvent(run._id.toHexString(), 'INFO', 'server', 'Second.');
    const events = (await fresh(run._id)).events;
    expect(events.map((e) => [e.level, e.source, e.message])).toEqual([
      ['WARN', 'guardrail', 'Stopping: p95.'],
      ['INFO', 'server', 'Second.'],
    ]);
    expect(events[0].at).toBeInstanceOf(Date);
  });

  it('keeps only the newest 1000 lines', async () => {
    const at = new Date();
    const events = Array.from({ length: 1000 }, (_, i) => ({ at, level: 'INFO', source: 'server', message: `line ${i}` }));
    const run = await createRun({ events });
    await appendEvent(run._id, 'ERROR', 'server', 'newest');
    const stored = (await fresh(run._id)).events;
    expect(stored).toHaveLength(1000);
    expect(stored[0].message).toBe('line 1');
    expect(stored[999].message).toBe('newest');
  });

  it('logs and swallows a failed write so the caller never fails on a log line', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    await expect(appendEvent('not-an-object-id', 'INFO', 'server', 'x')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('stressTest', 'appendEvent', expect.objectContaining({ runId: 'not-an-object-id' }));
  });
});

describe('finaliseRun', () => {
  const twoShards = (): IStressShardResult[] => [
    shard({
      shard: 0,
      summary: summary({ requests: 100, errors: 10, avg_ms: 100, p50_ms: 80, p95_ms: 200, p99_ms: 300, navigations: 10, navigation_errors: 1, avg_page_load_ms: 1000 }),
      endpoints: [
        endpoint({ key: 'q:Home', requests: 10, errors: 1, avg_ms: 50, p50_ms: 40, p95_ms: 100, p99_ms: 150 }),
        endpoint({ key: 'q:Pods', requests: 5, errors: 0, avg_ms: 300, p50_ms: 250, p95_ms: 900, p99_ms: 1000 }),
      ],
    }),
    shard({
      shard: 1,
      summary: summary({ requests: 300, errors: 5, avg_ms: 200, p50_ms: 160, p95_ms: 400, p99_ms: 600, navigations: 30, navigation_errors: 2, avg_page_load_ms: 2000 }),
      endpoints: [endpoint({ key: 'q:Home', requests: 30, errors: 3, avg_ms: 70, p50_ms: 60, p95_ms: 200, p99_ms: 250 })],
    }),
  ];

  it('merges the shards into a request-weighted summary and sorts endpoints worst p95 first', async () => {
    const run = await createRun({ started_at: new Date(Date.now() - 100_000), shard_results: twoShards() });
    noteShardReport(run._id.toHexString(), { shard: 0, received_at: Date.now() } as StressShardReport);

    await finaliseRun(run);

    const doc = await fresh(run._id);
    expect(doc.status).toBe('COMPLETED');
    expect(doc.ended_at).toBeInstanceOf(Date);
    expect(doc.error_message).toBe('');
    expect(doc.summary).toEqual({
      requests: 400,
      errors: 15,
      error_rate_pct: 3.8,
      avg_rps: 4,
      avg_ms: 175,
      p50_ms: 140,
      p95_ms: 350,
      p99_ms: 525,
      navigations: 40,
      navigation_errors: 3,
      avg_page_load_ms: 1750,
    });
    expect(doc.endpoints).toEqual([
      { key: 'q:Pods', requests: 5, errors: 0, avg_ms: 300, p50_ms: 250, p95_ms: 900, p99_ms: 1000 },
      { key: 'q:Home', requests: 40, errors: 4, avg_ms: 65, p50_ms: 55, p95_ms: 175, p99_ms: 225 },
    ]);
    expect(doc.events.at(-1)).toMatchObject({ level: 'INFO', source: 'server', message: 'Run finished: COMPLETED.' });
    expect(liveShards(run._id.toHexString())).toEqual([]);
  });

  it('fails the run when any shard failed and names each runner error', async () => {
    const run = await createRun({
      started_at: new Date(Date.now() - 10_000),
      shard_results: [shard({ shard: 0, outcome: 'ABORTED' }), shard({ shard: 1, outcome: 'FAILED', error: 'chrome crashed' })],
    });
    await finaliseRun(run);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('FAILED');
    expect(doc.error_message).toBe('Runner 2: chrome crashed');
    expect(doc.events.at(-1)).toMatchObject({ level: 'ERROR', message: 'Run finished: FAILED.' });
  });

  it('aborts the run when a stop was requested even though every shard completed', async () => {
    const run = await createRun({ status: 'STOPPING', stop_requested_at: new Date(), shard_results: [shard({ shard: 0 })] });
    await finaliseRun(run);
    expect((await fresh(run._id)).status).toBe('ABORTED');
  });

  it('aborts the run when a shard aborted on its own', async () => {
    const run = await createRun({ shard_results: [shard({ shard: 0, outcome: 'ABORTED', error: 'stop flag' })] });
    await finaliseRun(run);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('ABORTED');
    expect(doc.error_message).toBe('Runner 1: stop flag');
  });

  it('writes an all-zero summary for a run that never started and has no shard results', async () => {
    const run = await createRun();
    const bare = { ...run.toObject(), _id: run._id, shard_results: undefined } as unknown as IStressRun;
    await finaliseRun(bare);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('COMPLETED');
    expect(doc.summary).toEqual(summary({}));
    expect(doc.endpoints).toEqual([]);
  });

  it('treats missing endpoint lists and missing summary counts as zero', async () => {
    const partial = { shard: 0, outcome: 'COMPLETED', error: '', at: new Date(), summary: { requests: 10, errors: 1 } };
    const run = await createRun({ started_at: new Date(Date.now() - 5_000), shard_results: [partial] });
    await finaliseRun(run);
    const doc = await fresh(run._id);
    expect(doc.summary).toMatchObject({ requests: 10, errors: 1, error_rate_pct: 10, navigations: 0, navigation_errors: 0 });
    expect(doc.endpoints).toEqual([]);
  });

  it('leaves a run that already closed untouched and logs nothing new', async () => {
    const run = await createRun({ status: 'COMPLETED', error_message: 'kept' });
    await finaliseRun({ ...run.toObject(), _id: run._id, status: 'RUNNING', shard_results: [shard({ shard: 0, outcome: 'FAILED' })] } as unknown as IStressRun);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('COMPLETED');
    expect(doc.error_message).toBe('kept');
    expect(doc.events).toEqual([]);
  });
});

describe('endRun', () => {
  it('fails a live run, stamps the end and logs an ERROR line', async () => {
    const run = await createRun({ status: 'QUEUED' });
    noteShardReport(run._id.toHexString(), { shard: 0, received_at: Date.now() } as StressShardReport);
    await expect(endRun(run, 'FAILED', 'No runner.')).resolves.toBe(true);
    const doc = await fresh(run._id);
    expect(doc).toMatchObject({ status: 'FAILED', error_message: 'No runner.' });
    expect(doc.ended_at).toBeInstanceOf(Date);
    expect(doc.events.at(-1)).toMatchObject({ level: 'ERROR', source: 'server', message: 'No runner.' });
    expect(liveShards(run._id.toHexString())).toEqual([]);
  });

  it('aborts a stopping run with a WARN line', async () => {
    const run = await createRun({ status: 'STOPPING' });
    await expect(endRun(run, 'ABORTED', 'Not acknowledged.')).resolves.toBe(true);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('ABORTED');
    expect(doc.events.at(-1)).toMatchObject({ level: 'WARN', message: 'Not acknowledged.' });
  });

  it('refuses to overwrite a run that already finished', async () => {
    const run = await createRun({ status: 'COMPLETED' });
    await expect(endRun(run, 'FAILED', 'late')).resolves.toBe(false);
    const doc = await fresh(run._id);
    expect(doc.status).toBe('COMPLETED');
    expect(doc.error_message).toBe('');
    expect(doc.events).toEqual([]);
  });
});
