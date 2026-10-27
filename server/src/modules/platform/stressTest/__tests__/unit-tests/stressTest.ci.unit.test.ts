import { stressTestCi } from '../../stressTest.ci';
import { StressRunModel } from '../../stressTest.model';
import { noteShardReport } from '../../stressTest.live';
import { appendEvent, finaliseRun } from '../../stressTest.records';

jest.mock('../../stressTest.model', () => ({
  StressRunModel: { findOne: jest.fn(), findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('../../stressTest.traffic', () => ({ trafficKeyFor: jest.fn((id: string) => `key-for-${id}`) }));
jest.mock('../../stressTest.live', () => ({ noteShardReport: jest.fn() }));
jest.mock('../../stressTest.records', () => ({ appendEvent: jest.fn(), finaliseRun: jest.fn() }));

const oid = { toHexString: () => 'run-hex' };
const runDoc = (over: Record<string, unknown> = {}) => ({
  _id: oid,
  run_no: 3,
  status: 'QUEUED',
  dispatch_id: 'd1',
  stop_reason: '',
  profile: { runners: 2 },
  target_mweb_url: 'https://m',
  target_graphql_url: 'https://g',
  started_at: null,
  shard_results: [],
  ...over,
});
const found = (run: unknown) => (StressRunModel.findOne as jest.Mock).mockResolvedValue(run);
const fresh = (run: unknown) => (StressRunModel.findById as jest.Mock).mockResolvedValue(run);

describe('dispatch and shard validation', () => {
  it.each(['claim', 'report', 'finish'] as const)('%s rejects an unknown or missing dispatch id', async (method) => {
    found(null);
    await expect(stressTestCi[method]({ dispatch_id: 'nope', shard: 0 })).rejects.toMatchObject({
      message: 'No stress run matches this dispatch.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(stressTestCi[method]({ shard: 0 })).rejects.toMatchObject({ message: 'No stress run matches this dispatch.' });
    expect(StressRunModel.findOne).toHaveBeenCalledTimes(1);
  });

  it('trims and caps the dispatch id it looks up', async () => {
    found(null);
    await stressTestCi.claim({ dispatch_id: `  ${'x'.repeat(150)}  `, shard: 0 }).catch(() => undefined);
    expect(StressRunModel.findOne).toHaveBeenCalledWith({ dispatch_id: 'x'.repeat(100) });
  });

  it.each([-1, 2, 1.5, 'abc', undefined])('rejects shard %p outside the runner count', async (shard) => {
    found(runDoc());
    await expect(stressTestCi.claim({ dispatch_id: 'd1', shard })).rejects.toMatchObject({
      message: 'Shard must be between 0 and 1.',
    });
  });
});

describe('claim', () => {
  it('refuses a run that already ended', async () => {
    found(runDoc({ status: 'ABORTED' }));
    await expect(stressTestCi.claim({ dispatch_id: 'd1', shard: 0 })).resolves.toEqual({
      accepted: false,
      reason: 'The run is already ABORTED.',
      run_no: 3,
    });
    expect(StressRunModel.updateOne).not.toHaveBeenCalled();
  });

  it('starts a queued run once, stores the workflow link and hands over the plan', async () => {
    found(runDoc());
    const started = new Date('2026-01-01T00:00:00Z');
    fresh(runDoc({ status: 'RUNNING', started_at: started }));
    const out = await stressTestCi.claim({ dispatch_id: 'd1', shard: 1, workflow_run_id: 99, workflow_run_url: ' https://gh/run ' });

    expect(out).toEqual({
      accepted: true,
      reason: '',
      run_no: 3,
      traffic_key: 'key-for-d1',
      profile: { runners: 2 },
      target_mweb_url: 'https://m',
      target_graphql_url: 'https://g',
      started_at: started.toISOString(),
    });
    const calls = (StressRunModel.updateOne as jest.Mock).mock.calls;
    expect(calls[0][0]).toEqual({ _id: oid, status: 'QUEUED' });
    expect(calls[0][1].$set).toMatchObject({ status: 'RUNNING' });
    expect(calls[1]).toEqual([{ _id: oid }, { $set: { workflow_run_id: '99', workflow_run_url: 'https://gh/run' } }]);
    expect(appendEvent).toHaveBeenCalledWith(oid, 'INFO', 'runner-2', 'Runner 2 of 2 claimed the run.');
  });

  it('does not restart a run that is already running', async () => {
    found(runDoc({ status: 'RUNNING' }));
    fresh(runDoc({ status: 'RUNNING', started_at: new Date('2026-01-01T00:00:00Z') }));
    await stressTestCi.claim({ dispatch_id: 'd1', shard: 0 });
    const calls = (StressRunModel.updateOne as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][1].$set).toEqual({ workflow_run_id: '', workflow_run_url: '' });
  });

  it('falls back to now when the run has no start time yet', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-03T03:03:03Z'));
    try {
      found(runDoc({ status: 'RUNNING' }));
      fresh(runDoc({ status: 'RUNNING', started_at: null }));
      const out = await stressTestCi.claim({ dispatch_id: 'd1', shard: 0 });
      expect(out.started_at).toBe('2026-03-03T03:03:03.000Z');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('report', () => {
  const body = (over: Record<string, unknown> = {}) => ({ dispatch_id: 'd1', shard: 0, ...over });

  it('tells a runner to stop once the run has ended', async () => {
    found(runDoc({ status: 'COMPLETED' }));
    await expect(stressTestCi.report(body())).resolves.toEqual({ stop: true, reason: 'The run is already COMPLETED.' });
    expect(noteShardReport).not.toHaveBeenCalled();
  });

  it('cleans the report before keeping it, and logs the events with a sane level', async () => {
    found(runDoc({ status: 'RUNNING', stop_reason: undefined }));
    const bots = Array.from({ length: 70 }, (_, i) => ({ bot: `b${i}`, kind: i === 0 ? 'BROWSER' : 'other', load_ms: -5.4 }));
    const events = Array.from({ length: 25 }, (_, i) => ({ level: i === 0 ? 'WARN' : 'LOUD', message: `m${i}` }));
    const result = await stressTestCi.report(
      body({
        phase: 'ramp',
        elapsed_seconds: '12',
        active_vus: -3,
        requests: 'oops',
        p95_ms: 250,
        status_counts: [{ code: 200, count: 5 }, { code: '5xx', count: -1 }],
        bots: [{ ...bots[0], journey: 'j', page: '/p', status: 'ok', at: 't', load_ms: 123.6 }, ...bots.slice(1)],
        events,
      })
    );

    expect(result).toEqual({ stop: false, reason: '' });
    const noted = (noteShardReport as jest.Mock).mock.calls[0];
    expect(noted[0]).toBe('run-hex');
    expect(noted[1]).toMatchObject({
      shard: 0, phase: 'ramp', elapsed_seconds: 12, active_vus: 0, requests: 0, p95_ms: 250,
      status_counts: [{ code: '200', count: 5 }, { code: '5xx', count: 0 }],
    });
    expect(noted[1].bots).toHaveLength(60);
    expect(noted[1].bots[0]).toEqual({ bot: 'b0', kind: 'BROWSER', journey: 'j', page: '/p', status: 'ok', load_ms: 124, at: 't' });
    expect(noted[1].bots[1]).toMatchObject({ kind: 'HTTP', load_ms: 0 });
    expect(typeof noted[1].received_at).toBe('number');
    expect(StressRunModel.updateOne).toHaveBeenCalledWith({ _id: oid }, { $set: { last_report_at: expect.any(Date) } });
    expect(appendEvent).toHaveBeenCalledTimes(20);
    expect(appendEvent).toHaveBeenNthCalledWith(1, oid, 'WARN', 'runner-1', 'm0');
    expect(appendEvent).toHaveBeenNthCalledWith(2, oid, 'INFO', 'runner-1', 'm1');
  });

  it('accepts a bare report with no lists and signals a stop when the run is stopping', async () => {
    found(runDoc({ status: 'STOPPING', stop_reason: 'cpu high' }));
    const out = await stressTestCi.report(body({ status_counts: 'x', bots: 'x', events: 'x' }));
    expect(out).toEqual({ stop: true, reason: 'cpu high' });
    expect((noteShardReport as jest.Mock).mock.calls[0][1]).toMatchObject({ status_counts: [], bots: [] });
    expect(appendEvent).not.toHaveBeenCalled();
  });
});

describe('finish', () => {
  const body = (over: Record<string, unknown> = {}) => ({ dispatch_id: 'd1', shard: 0, outcome: 'COMPLETED', ...over });

  it('replaces the shard result atomically, logs it, and waits for the other shards', async () => {
    found(runDoc({ status: 'RUNNING' }));
    fresh(runDoc({ shard_results: [{ shard: 0 }] }));
    const endpoints = Array.from({ length: 120 }, (_, i) => ({ key: `/e${i}`, requests: 2, errors: -1, p95_ms: 'x' }));
    await expect(
      stressTestCi.finish(body({ summary: { requests: 10, errors: 1, error_rate_pct: 10 }, endpoints, error: '' }))
    ).resolves.toBe(true);

    const calls = (StressRunModel.updateOne as jest.Mock).mock.calls;
    expect(calls[0]).toEqual([{ _id: oid }, { $pull: { shard_results: { shard: 0 } } }]);
    const pushed = calls[1][1].$push.shard_results;
    expect(pushed).toMatchObject({ shard: 0, outcome: 'COMPLETED', error: '' });
    expect(pushed.summary).toMatchObject({ requests: 10, errors: 1, error_rate_pct: 10, p99_ms: 0 });
    expect(pushed.endpoints).toHaveLength(100);
    expect(pushed.endpoints[0]).toEqual({ key: '/e0', requests: 2, errors: 0, avg_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 });
    expect(appendEvent).toHaveBeenCalledWith(oid, 'INFO', 'runner-1', 'Runner 1 finished: COMPLETED.');
    expect(finaliseRun).not.toHaveBeenCalled();
  });

  it('finalises the run when the last shard reports, and records a failure with its error', async () => {
    found(runDoc({ status: 'RUNNING' }));
    const done = runDoc({ shard_results: [{ shard: 0 }, { shard: 1 }] });
    fresh(done);
    await stressTestCi.finish(body({ shard: 1, outcome: 'weird', error: 'boom', summary: undefined, endpoints: 'x' }));
    const pushed = (StressRunModel.updateOne as jest.Mock).mock.calls[1][1].$push.shard_results;
    expect(pushed).toMatchObject({ shard: 1, outcome: 'FAILED', error: 'boom', endpoints: [] });
    expect(pushed.summary.requests).toBe(0);
    expect(appendEvent).toHaveBeenCalledWith(oid, 'ERROR', 'runner-2', 'Runner 2 finished: FAILED — boom.');
    expect(finaliseRun).toHaveBeenCalledWith(done);
  });

  it('treats a run with no recorded shard results as unfinished', async () => {
    found(runDoc({ status: 'RUNNING' }));
    fresh(runDoc({ shard_results: undefined }));
    await stressTestCi.finish(body());
    expect(finaliseRun).not.toHaveBeenCalled();
  });

  it.each(['ABORTED', 'COMPLETED'])('keeps a reported %s outcome as is', async (outcome) => {
    found(runDoc({ status: 'RUNNING' }));
    fresh(runDoc());
    await stressTestCi.finish(body({ outcome }));
    expect((StressRunModel.updateOne as jest.Mock).mock.calls[1][1].$push.shard_results.outcome).toBe(outcome);
  });
});
