/**
 * stressTestService: reading runs, the settings ceilings, the trigger guards
 * and stopping/removing runs — against a real database. GitHub, the server's
 * own URLs, the pulse and the deployment environment are mocked.
 */
const mockServerEnv = { value: 'staging' };
jest.mock('@observability/log', () => {
  const actual = jest.requireActual('@observability/log');
  return {
    ...actual,
    get SERVER_ENV() {
      return mockServerEnv.value;
    },
  };
});
jest.mock('@observability/serverPulse', () => ({ readServerPulse: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@utils/github-actions', () => ({
  githubRepoConfig: jest.fn(),
  requireGithubRepoConfig: jest.fn(),
  dispatchWorkflow: jest.fn(),
  cancelWorkflowRun: jest.fn(),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { readServerPulse } from '@observability/serverPulse';
import { getUrlConfigs } from '@config/url-configs';
import { cancelWorkflowRun, dispatchWorkflow, githubRepoConfig, requireGithubRepoConfig } from '@utils/github-actions';
import type { AuthUser } from '@context';
import { StressRunModel, StressSampleModel, type IStressRun } from '../../stressTest.model';
import { noteShardReport, type StressShardReport } from '../../stressTest.live';
import { hashTrafficKey, trafficKeyFor } from '../../stressTest.traffic';
import { cancelRunWorkflow, stressTestService, STRESS_WORKFLOW_FILE } from '../../stressTest.service';

const cfg = { token: 'gh-test-token', owner: 'acme', repo: 'app' };
const ops: AuthUser = { id: '64b0000000000000000000aa', email: 'ops@example.com', roles: ['TECH_MANAGER'] };
const superAdmin: AuthUser = { id: '64b0000000000000000000bb', email: 'root@example.com', roles: ['SUPER_ADMIN'] };

const validProfile = () => ({
  virtual_users: 50,
  browser_bots: 2,
  runners: 2,
  ramp_up_seconds: 60,
  hold_seconds: 300,
  ramp_down_seconds: 30,
  think_time_ms: 1000,
  journeys: ['explore', 'home'],
});

let seq = 0;
const createRun = (overrides: Record<string, unknown> = {}) => {
  seq += 1;
  return StressRunModel.create({
    run_no: `DUN-STR-S${String(seq).padStart(5, '0')}`,
    status: 'COMPLETED',
    environment: 'staging',
    target_mweb_url: 'https://staging.example.com',
    target_graphql_url: 'https://staging.api.example.com/graphql',
    profile: { virtual_users: 10 },
    ...overrides,
  });
};

const useUrls = (mwebUrl: string, serverUrl: string) => {
  (getUrlConfigs as jest.Mock).mockResolvedValue({ mwebUrl, serverUrl });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockServerEnv.value = 'staging';
  useUrls('https://staging.example.com/', 'https://staging.api.example.com/');
  (githubRepoConfig as jest.Mock).mockResolvedValue(cfg);
  (requireGithubRepoConfig as jest.Mock).mockResolvedValue(cfg);
  (dispatchWorkflow as jest.Mock).mockResolvedValue(undefined);
  (cancelWorkflowRun as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('reading runs', () => {
  it('pages the run table newest first', async () => {
    await createRun({ run_no: 'DUN-STR-A' });
    await createRun({ run_no: 'DUN-STR-B' });
    await createRun({ run_no: 'DUN-STR-C' });

    const page = await stressTestService.table({ page: 1, page_size: 2 });
    expect(page.total).toBe(3);
    expect(page.page_size).toBe(2);
    expect(page.rows.map((r) => r.run_no)).toEqual(['DUN-STR-C', 'DUN-STR-B']);

    const all = await stressTestService.table(null);
    expect(all.rows).toHaveLength(3);
  });

  it('returns one run, and refuses an id that no longer exists', async () => {
    const run = await createRun();
    await expect(stressTestService.run(run._id.toHexString())).resolves.toMatchObject({ id: run._id.toHexString() });
    await expect(stressTestService.run(new Types.ObjectId().toHexString())).rejects.toMatchObject({
      message: 'That stress run no longer exists.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it("reads only the run's own samples, oldest first", async () => {
    const run = await createRun();
    const other = await createRun();
    const expires = new Date(Date.now() + 86_400_000);
    const late = new Date('2026-09-01T10:00:10Z');
    const early = new Date('2026-09-01T10:00:05Z');
    await StressSampleModel.create([
      { run_id: run._id, at: late, load: { rps: 2 }, server: {}, expires_at: expires },
      { run_id: run._id, at: early, load: { rps: 1 }, server: {}, expires_at: expires },
      { run_id: other._id, at: early, load: { rps: 9 }, server: {}, expires_at: expires },
    ]);
    const samples = await stressTestService.samples(run._id.toHexString());
    expect(samples.map((s) => [s.at, s.load])).toEqual([
      [early.toISOString(), { rps: 1 }],
      [late.toISOString(), { rps: 2 }],
    ]);
  });

  it('lists the live shards in shard order with an ISO received time', () => {
    const runId = new Types.ObjectId().toHexString();
    const at = Date.parse('2026-09-01T10:00:00Z');
    noteShardReport(runId, { shard: 1, phase: 'hold', received_at: at } as StressShardReport);
    noteShardReport(runId, { shard: 0, phase: 'ramp', received_at: at } as StressShardReport);
    const live = stressTestService.live(runId);
    expect(live.map((s) => [s.shard, s.phase, s.received_at])).toEqual([
      [0, 'ramp', '2026-09-01T10:00:00.000Z'],
      [1, 'hold', '2026-09-01T10:00:00.000Z'],
    ]);
    expect(stressTestService.live(new Types.ObjectId().toHexString())).toEqual([]);
  });

  it("passes the server's pulse straight through", () => {
    const pulse = { host_cpu_pct: 12 };
    (readServerPulse as jest.Mock).mockReturnValue(pulse);
    expect(stressTestService.pulse()).toBe(pulse);
  });
});

describe('settings', () => {
  const validSettings = {
    max_virtual_users: 1000,
    max_browser_bots: 5,
    max_runners: 6,
    max_duration_minutes: 45,
    abort_error_rate_pct: 30,
    abort_p95_ms: 5000,
    abort_host_cpu_pct: 90,
    abort_host_memory_pct: 85,
    abort_breach_samples: 4,
    sample_retention_days: 14,
  };

  it('reads the defaults on first use', async () => {
    await expect(stressTestService.settings()).resolves.toMatchObject({ max_virtual_users: 500, max_runners: 4 });
  });

  it('stores a valid set of ceilings and reads them back', async () => {
    const saved = await stressTestService.updateSettings(validSettings);
    expect(saved).toMatchObject(validSettings);
    await expect(stressTestService.settings()).resolves.toMatchObject(validSettings);
  });

  it('accepts every bound exactly on its edge', async () => {
    const edge = { ...validSettings, max_virtual_users: 20_000, max_browser_bots: 0, max_runners: 1, abort_p95_ms: 100, sample_retention_days: 365 };
    await expect(stressTestService.updateSettings(edge)).resolves.toMatchObject(edge);
  });

  it.each([
    ['max_virtual_users', 0, 'Max virtual users must be between 1 and 20000.'],
    ['max_browser_bots', 51, 'Max browser bots must be between 0 and 50.'],
    ['max_runners', 1.5, 'Max runners must be between 1 and 20.'],
    ['max_duration_minutes', 'lots', 'Max duration must be between 1 and 120 minutes.'],
    ['abort_error_rate_pct', 101, 'Error-rate guardrail must be between 1 and 100%.'],
    ['abort_p95_ms', 99, 'Latency guardrail must be between 100 and 120000 ms.'],
    ['abort_host_cpu_pct', 9, 'CPU guardrail must be between 10 and 100%.'],
    ['abort_host_memory_pct', 101, 'Memory guardrail must be between 10 and 100%.'],
    ['abort_breach_samples', 61, 'Breach count must be between 1 and 60.'],
    ['sample_retention_days', 0, 'Retention must be between 1 and 365 days.'],
  ])('refuses %s = %p', async (field, value, message) => {
    await expect(stressTestService.updateSettings({ ...validSettings, [field]: value })).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('triggerConfig', () => {
  it('is configured on staging with staging URLs and GitHub set up', async () => {
    const out = await stressTestService.triggerConfig(ops);
    expect(out).toMatchObject({
      configured: true,
      blocked_reason: '',
      environment: 'staging',
      requires_confirmation: false,
      confirm_text: 'PRODUCTION',
      can_start: true,
      live_run_no: null,
      target_mweb_url: 'https://staging.example.com',
      target_graphql_url: 'https://staging.api.example.com/graphql',
      repository: 'acme/app',
      ref: 'staging',
    });
    expect(out.journeys).toContain('home');
    expect(out.limits.max_virtual_users).toBe(500);
  });

  it('is blocked locally', async () => {
    mockServerEnv.value = 'localhost';
    await expect(stressTestService.triggerConfig(ops)).resolves.toMatchObject({ configured: false, blocked_reason: 'LOCAL' });
  });

  it('is blocked when a staging server would send its load off staging', async () => {
    useUrls('https://staging.example.com', 'https://api.example.com');
    await expect(stressTestService.triggerConfig(ops)).resolves.toMatchObject({ configured: false, blocked_reason: 'TARGET' });
  });

  it('is blocked when GitHub is not configured, and names no repository', async () => {
    (githubRepoConfig as jest.Mock).mockResolvedValue(null);
    await expect(stressTestService.triggerConfig(ops)).resolves.toMatchObject({
      configured: false,
      blocked_reason: 'GITHUB',
      repository: '',
    });
  });

  it('on production requires confirmation, dispatches on main and lets only a Super Admin start', async () => {
    mockServerEnv.value = 'production';
    useUrls('https://example.com', 'https://api.example.com');
    await createRun({ run_no: 'DUN-STR-LIVE', status: 'RUNNING' });

    const asOps = await stressTestService.triggerConfig(ops);
    expect(asOps).toMatchObject({
      configured: true,
      requires_confirmation: true,
      can_start: false,
      ref: 'main',
      live_run_no: 'DUN-STR-LIVE',
    });
    await expect(stressTestService.triggerConfig(superAdmin)).resolves.toMatchObject({ can_start: true });
  });
});

describe('trigger', () => {
  it('queues a run, dispatches the workflow and never stores the traffic key itself', async () => {
    const run = await stressTestService.trigger(validProfile(), ops);

    expect(run).toMatchObject({
      run_no: 'DUN-STR-000001',
      status: 'QUEUED',
      environment: 'staging',
      target_mweb_url: 'https://staging.example.com',
      target_graphql_url: 'https://staging.api.example.com/graphql',
      triggered_by: 'ops@example.com',
      ref: 'staging',
    });
    expect(run.profile).toMatchObject({ virtual_users: 50, runners: 2, journeys: ['home', 'explore'] });
    expect(run.events).toEqual([expect.objectContaining({ level: 'INFO', source: 'portal', message: 'Queued by ops@example.com.' })]);

    const stored = (await StressRunModel.findById(run.id).lean()) as unknown as IStressRun;
    expect(stored.traffic_key_hash).toBe(hashTrafficKey(trafficKeyFor(stored.dispatch_id)));
    expect(dispatchWorkflow).toHaveBeenCalledWith(cfg, STRESS_WORKFLOW_FILE, 'staging', {
      dispatch_id: stored.dispatch_id,
      report_url: 'https://staging.api.example.com/graphql',
      runners: '2',
      timeout_minutes: '17',
    });
    expect(logs.server.warn).toHaveBeenCalledWith('stressTest', 'trigger', expect.objectContaining({ run_no: 'DUN-STR-000001' }));
  });

  it('credits the user id when the account has no email', async () => {
    const run = await stressTestService.trigger(validProfile(), { id: 'u-1', email: null, roles: ['TECH_MANAGER'] });
    expect(run.triggered_by).toBe('u-1');
    expect(run.events[0].message).toBe('Queued by u-1.');
  });

  it('refuses to target a local server', async () => {
    mockServerEnv.value = 'localhost';
    await expect(stressTestService.trigger(validProfile(), ops)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(dispatchWorkflow).not.toHaveBeenCalled();
  });

  it('refuses production for anyone but a Super Admin', async () => {
    mockServerEnv.value = 'production';
    await expect(stressTestService.trigger({ ...validProfile(), confirm_text: 'PRODUCTION' }, ops)).rejects.toMatchObject({
      message: 'Only a Super Admin can stress production.',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it.each([[undefined], ['production'], ['PROD']])('refuses production without the typed confirmation (%p)', async (confirm) => {
    mockServerEnv.value = 'production';
    await expect(stressTestService.trigger({ ...validProfile(), confirm_text: confirm }, superAdmin)).rejects.toMatchObject({
      message: 'Type PRODUCTION to confirm a run against production.',
    });
    expect(await StressRunModel.countDocuments()).toBe(0);
  });

  it('accepts a padded confirmation on production and dispatches on main', async () => {
    mockServerEnv.value = 'production';
    useUrls('https://example.com', 'https://api.example.com');
    const run = await stressTestService.trigger({ ...validProfile(), confirm_text: '  PRODUCTION ' }, superAdmin);
    expect(run).toMatchObject({ environment: 'production', ref: 'main' });
    expect((dispatchWorkflow as jest.Mock).mock.calls[0][2]).toBe('main');
  });

  it.each([
    [{ virtual_users: 501 }, 'Virtual users must be between 1 and 500.'],
    [{ virtual_users: 0 }, 'Virtual users must be between 1 and 500.'],
    [{ runners: 5 }, 'Runners must be between 1 and 4.'],
    [{ virtual_users: 1, runners: 2 }, 'Every runner needs at least one virtual user.'],
    [{ browser_bots: 11 }, 'Browser bots must be between 0 and 10.'],
    [{ ramp_up_seconds: -1 }, 'Ramp-up must be between 0 and 1800 seconds.'],
    [{ hold_seconds: 9 }, 'Hold must be between 10 and 7200 seconds.'],
    [{ ramp_down_seconds: 601 }, 'Ramp-down must be between 0 and 600 seconds.'],
    [{ think_time_ms: 60_001 }, 'Think time must be between 0 and 60000 ms.'],
    [{ ramp_up_seconds: 600, hold_seconds: 1300, ramp_down_seconds: 0 }, 'The whole run must fit in 30 minutes.'],
    [{ journeys: ['teleport'] }, 'Unknown journey: teleport'],
    [{ journeys: [] }, 'Pick at least one journey for the bots to walk.'],
  ])('refuses the profile %j', async (patch, message) => {
    await expect(stressTestService.trigger({ ...validProfile(), ...patch }, ops)).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(dispatchWorkflow).not.toHaveBeenCalled();
  });

  it('accepts a run that fills the maximum duration exactly', async () => {
    const run = await stressTestService.trigger({ ...validProfile(), ramp_up_seconds: 600, hold_seconds: 1200, ramp_down_seconds: 0 }, ops);
    expect(run.status).toBe('QUEUED');
    expect((dispatchWorkflow as jest.Mock).mock.calls[0][3].timeout_minutes).toBe('40');
  });

  it('refuses a second run while one is live', async () => {
    await createRun({ run_no: 'DUN-STR-BUSY', status: 'STOPPING' });
    await expect(stressTestService.trigger(validProfile(), ops)).rejects.toMatchObject({
      message: 'DUN-STR-BUSY is still running. Stop it before starting another.',
    });
  });

  it('surfaces a missing GitHub configuration without creating a row', async () => {
    (requireGithubRepoConfig as jest.Mock).mockRejectedValue(new Error('GitHub is not configured.'));
    await expect(stressTestService.trigger(validProfile(), ops)).rejects.toThrow('GitHub is not configured.');
    expect(await StressRunModel.countDocuments()).toBe(0);
  });

  it("refuses to send staging's load to a non-staging host", async () => {
    useUrls('https://staging.example.com', 'https://api.example.com/');
    await expect(stressTestService.trigger(validProfile(), ops)).rejects.toMatchObject({
      message: "This staging server's URLs point at https://staging.example.com and https://api.example.com — refusing to send staging's load there.",
    });
    expect(await StressRunModel.countDocuments()).toBe(0);
  });

  it('deletes the queued row when GitHub refuses the dispatch', async () => {
    (dispatchWorkflow as jest.Mock).mockRejectedValue(new Error('HTTP 422'));
    await expect(stressTestService.trigger(validProfile(), ops)).rejects.toThrow('HTTP 422');
    expect(await StressRunModel.countDocuments()).toBe(0);
  });
});

describe('stop', () => {
  it('refuses a run that no longer exists', async () => {
    await expect(stressTestService.stop(new Types.ObjectId().toHexString(), ops)).rejects.toMatchObject({
      message: 'That stress run no longer exists.',
    });
  });

  it('ends a queued run at once', async () => {
    const run = await createRun({ status: 'QUEUED' });
    const out = await stressTestService.stop(run._id.toHexString(), ops);
    expect(out).toMatchObject({ status: 'ABORTED', error_message: 'Cancelled by ops@example.com before a runner picked it up.' });
  });

  it('flags a running run to stop and logs who asked', async () => {
    const run = await createRun({ status: 'RUNNING' });
    const out = await stressTestService.stop(run._id.toHexString(), { id: 'u-7', roles: [] });
    expect(out).toMatchObject({ status: 'STOPPING', stop_reason: 'Stopped by u-7' });
    expect(out.stop_requested_at).not.toBeNull();
    expect(out.events.at(-1)).toMatchObject({ level: 'WARN', source: 'portal', message: 'Stop requested by u-7.' });
    expect(logs.server.warn).toHaveBeenCalledWith('stressTest', 'stop', { userId: 'u-7', run_no: run.run_no, from: 'RUNNING' });
  });

  it('leaves a finished run as it is', async () => {
    const run = await createRun({ status: 'COMPLETED' });
    const out = await stressTestService.stop(run._id.toHexString(), ops);
    expect(out).toMatchObject({ status: 'COMPLETED', stop_reason: '', events: [] });
  });
});

describe('remove', () => {
  it('is a no-op success for a run that is already gone', async () => {
    await expect(stressTestService.remove(new Types.ObjectId().toHexString())).resolves.toBe(true);
  });

  it('refuses to delete a live run', async () => {
    const run = await createRun({ status: 'RUNNING' });
    await expect(stressTestService.remove(run._id.toHexString())).rejects.toMatchObject({ message: 'Stop the run before deleting it.' });
    expect(await StressRunModel.countDocuments()).toBe(1);
  });

  it("deletes a finished run with its samples and leaves other runs' samples", async () => {
    const run = await createRun({ status: 'FAILED' });
    const other = await createRun({ status: 'COMPLETED' });
    const sample = (runId: Types.ObjectId) => ({ run_id: runId, at: new Date(), load: {}, server: {}, expires_at: new Date(Date.now() + 60_000) });
    await StressSampleModel.create([sample(run._id), sample(run._id), sample(other._id)]);

    await expect(stressTestService.remove(run._id.toHexString())).resolves.toBe(true);
    expect(await StressRunModel.exists({ _id: run._id })).toBeNull();
    expect(await StressSampleModel.countDocuments({ run_id: run._id })).toBe(0);
    expect(await StressSampleModel.countDocuments({ run_id: other._id })).toBe(1);
  });
});

describe('cancelRunWorkflow', () => {
  it('does nothing for a run GitHub never assigned a workflow run', async () => {
    const run = await createRun({ workflow_run_id: '' });
    await cancelRunWorkflow(run);
    expect(githubRepoConfig).not.toHaveBeenCalled();
    expect(cancelWorkflowRun).not.toHaveBeenCalled();
  });

  it('does nothing when GitHub is no longer configured', async () => {
    (githubRepoConfig as jest.Mock).mockResolvedValue(null);
    const run = await createRun({ workflow_run_id: '9001' });
    await cancelRunWorkflow(run);
    expect(cancelWorkflowRun).not.toHaveBeenCalled();
  });

  it('cancels the workflow run and notes it on the timeline', async () => {
    const run = await createRun({ workflow_run_id: '9001' });
    await cancelRunWorkflow(run);
    expect(cancelWorkflowRun).toHaveBeenCalledWith(cfg, '9001');
    const stored = (await StressRunModel.findById(run._id).lean()) as unknown as IStressRun;
    expect(stored.events.at(-1)).toMatchObject({ level: 'WARN', message: 'Cancelled the GitHub workflow run.' });
  });

  it('logs a refused cancel and leaves the timeline untouched', async () => {
    (cancelWorkflowRun as jest.Mock).mockRejectedValue(new Error('HTTP 500'));
    const run = await createRun({ workflow_run_id: '9001' });
    await expect(cancelRunWorkflow(run)).resolves.toBeUndefined();
    expect(logs.server.error).toHaveBeenCalledWith('stressTest', 'cancelWorkflow', expect.objectContaining({ run_no: run.run_no }));
    const stored = (await StressRunModel.findById(run._id).lean()) as unknown as IStressRun;
    expect(stored.events).toEqual([]);
  });
});
