/**
 * An e2e run's life, against a real database: dispatched from the portal or
 * the schedule, claimed by the runner, reported into leg by leg, announced
 * once on Slack, listed, removed and pruned.
 *
 * GitHub's dispatch, Slack and runtime env are mocked. The real repo-config,
 * URL, suite-catalogue, identity and schedule logic run on top of the mocked
 * env, so their answers are the genuine ones for that configuration.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  ...jest.requireActual('@config/runtimeEnv'),
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));
jest.mock('@utils/github-actions', () => ({
  ...jest.requireActual('@utils/github-actions'),
  dispatchWorkflow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/platform/slack/slack.gateway', () => ({
  ...jest.requireActual('@modules/platform/slack/slack.gateway'),
  postMessage: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  isSlackConfigured: jest.fn().mockResolvedValue(false),
}));

import { e2eRunService } from '../../e2eRun.service';
import { E2eRunModel, E2eRunSettingsModel, E2E_SETTINGS_KEY } from '../../e2eRun.model';
import { E2E_SUITES } from '../../e2eRun.suites';
import { dispatchWorkflow } from '@utils/github-actions';
import { deleteFile, postMessage } from '@modules/platform/slack/slack.gateway';
import { logs } from '@observability/log';

const dispatch = dispatchWorkflow as jest.Mock;
const post = postMessage as jest.Mock;
const removeFile = deleteFile as jest.Mock;
const user = { id: '64b0000000000000000000bb', email: 'qa@example.com', roles: ['TECH_MANAGER'] } as any;
const RUN_URL = 'https://github.com/acme/app/actions/runs/500';

const configureGithub = () => {
  mockEnv.GITHUB_TOKEN = 'gh-test-token';
  mockEnv.GITHUB_OWNER = 'acme';
  mockEnv.GITHUB_REPO = 'app';
};

const setSettings = (set: Record<string, unknown>) =>
  E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: set }, { upsert: true });

const postedText = () => JSON.stringify(post.mock.calls.at(-1)?.[0]?.blocks ?? []);

/** A run the runner has claimed, ready to be reported into. */
async function runningRun(over: Record<string, unknown> = {}) {
  const res = await e2eRunService.start(
    { workflow_run_id: '500', workflow_run_url: RUN_URL, ref: 'staging', commit_sha: 'abcdef1234567', ...over },
    'ci',
  );
  return res.run;
}

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SERVER_URL = 'https://api.example.test/';
  mockEnv.TECH_URL = 'https://tech.example.test/';
  mockEnv.SLACK_E2E_CHANNEL = 'C-E2E';
  post.mockResolvedValue({ channel: 'C-E2E', ts: '900.1' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('trigger', () => {
  it('refuses a suite the repository does not run', async () => {
    configureGithub();
    await expect(e2eRunService.trigger({ suites: ['nope'] }, user)).rejects.toMatchObject({
      message: 'Not a suite this repository runs: nope',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses when GitHub is not configured, leaving no row', async () => {
    await expect(e2eRunService.trigger({ suites: [] }, user)).rejects.toMatchObject({
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(await E2eRunModel.countDocuments()).toBe(0);
  });

  it('queues a run on the default branch with the run identity stamped on the row', async () => {
    configureGithub();
    await setSettings({ email_prefix: 'qa+', email_domain: 'example.com', identity_phone: '9000000000' });

    const res = await e2eRunService.trigger({ suites: ['accounts'] }, user);

    expect(res.run).toMatchObject({
      status: 'QUEUED',
      trigger_source: 'PORTAL',
      triggered_by: 'qa@example.com',
      ref: 'staging',
      requested_suites: ['accounts'],
      stage: 'Waiting for a runner',
      identity_phone: '9000000000',
    });
    expect(res.run.run_no).toMatch(/^DUN-E2E-\d{6}$/);
    expect(res.run.identity_stamp).toMatch(/^\d{12}$/);
    expect(res.run.signup_email).toBe(`qa+${res.run.identity_stamp}@example.com`);
    expect(res.run.login_email).toBe(res.run.signup_email);
    expect(dispatch).toHaveBeenCalledWith(
      { token: 'gh-test-token', owner: 'acme', repo: 'app' },
      'e2e.yml',
      'staging',
      { suites: 'accounts', dispatch_id: res.run.dispatch_id, report_url: 'https://api.example.test/graphql' },
    );
    expect(res.actions_url).toBe('https://github.com/acme/app/actions/workflows/e2e.yml?query=branch%3Astaging');
  });

  it('sends every suite as an empty list, honours an explicit ref, and names a caller without email by id', async () => {
    configureGithub();
    const res = await e2eRunService.trigger(
      { suites: E2E_SUITES.map((s) => s.key), ref: ' feature/e2e ' },
      { ...user, email: null },
    );
    expect(res.run.requested_suites).toEqual([]);
    expect(res.run.ref).toBe('feature/e2e');
    expect(res.run.triggered_by).toBe(user.id);
    expect(res.run.signup_email).toBe('');
    expect(dispatch.mock.calls[0][3].suites).toBe('');
  });

  it('removes the queued row when GitHub refuses the dispatch', async () => {
    configureGithub();
    dispatch.mockRejectedValueOnce(new Error('422 Unexpected inputs'));
    await expect(e2eRunService.trigger({ suites: [] }, user)).rejects.toThrow('422 Unexpected inputs');
    expect(await E2eRunModel.countDocuments()).toBe(0);
  });
});

describe('start', () => {
  it('claims the dispatched row and hands the runner its identity and suites', async () => {
    configureGithub();
    await setSettings({ email_prefix: 'qa', email_domain: 'example.com', password: 'fake-run-password' });
    const queued = await e2eRunService.trigger({ suites: ['no-surface'] }, user);

    const res = await e2eRunService.start(
      { dispatch_id: queued.run.dispatch_id, workflow_run_id: '501', workflow_run_url: RUN_URL, commit_sha: 'c0ffee' },
      'ci-bot',
    );

    expect(res.run.id).toBe(queued.run.id);
    expect(res.run).toMatchObject({
      status: 'RUNNING',
      workflow_run_id: '501',
      ref: 'staging',
      commit_sha: 'c0ffee',
      stage: 'Running suites',
      reported_by: 'ci-bot',
    });
    expect(res.run.stages.map((s) => s.name)).toEqual(['Queued', 'Running suites']);
    expect(res.suites).toEqual(['no-surface']);
    expect(res.credentials).toEqual({
      stamp: queued.run.identity_stamp,
      login_email: queued.run.login_email,
      signup_email: queued.run.signup_email,
      password: 'fake-run-password',
      phone: '',
    });
    expect(await E2eRunModel.countDocuments()).toBe(1);
  });

  it('opens a MANUAL row for a run started from the Actions tab, with no credentials when no identity is set', async () => {
    const res = await e2eRunService.start(
      { workflow_run_id: '502', triggered_by: 'octocat', suites: ['accounts'] },
      'ci',
    );
    expect(res.run).toMatchObject({
      trigger_source: 'MANUAL',
      triggered_by: 'octocat',
      ref: 'staging',
      requested_suites: ['accounts'],
      status: 'RUNNING',
    });
    expect(res.credentials).toBeNull();
    expect(res.suites).toEqual(['accounts']);
  });

  it('refuses an unknown suite on a manual start', async () => {
    await expect(e2eRunService.start({ workflow_run_id: '503', suites: ['bogus'] }, 'ci')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('report', () => {
  it('refuses a report no run matches', async () => {
    await expect(e2eRunService.report({ workflow_run_id: 'nope' }, 'ci')).rejects.toThrow(/Call startE2eRun first/);
    await expect(e2eRunService.report({}, 'ci')).rejects.toThrow(/Call startE2eRun first/);
  });

  it('refuses a suite result with no key', async () => {
    await runningRun();
    await expect(e2eRunService.report({ workflow_run_id: '500', suite: { key: ' ' } }, 'ci')).rejects.toThrow(
      'A suite result needs a key.',
    );
  });

  it('merges legs, replaces a re-reported leg keeping its recording, and sums the totals', async () => {
    const run = await runningRun();
    await e2eRunService.report(
      { workflow_run_id: '500', stage: 'Accounts', suite: { key: 'accounts', status: 'FAILED', tests: '5', passed: 3, failed: 2, error: 'login broke' } },
      'ci',
    );
    await E2eRunModel.updateOne(
      { _id: run.id, 'results.key': 'accounts' },
      { $set: { 'results.$.video_file_id': 'F-ACC', 'results.$.video_seconds': 61 } },
    );
    await e2eRunService.report(
      { workflow_run_id: '500', suite: { key: 'no-surface', status: 'SKIPPED', tests: 'not-a-number' } },
      'ci',
    );
    const res = await e2eRunService.report(
      { workflow_run_id: '500', stage: 'Accounts', suite: { key: 'accounts', status: 'PASSED', tests: 5, passed: 5, failed: 0 } },
      'ci',
    );

    expect(res.results).toHaveLength(2);
    const accounts = res.results.find((r) => r.key === 'accounts')!;
    expect(accounts).toMatchObject({ status: 'PASSED', passed: 5, error: '', video_file_id: 'F-ACC', video_seconds: 61 });
    expect(res.results.find((r) => r.key === 'no-surface')!.tests).toBeNull();
    expect(res.totals).toEqual({
      suites: 2,
      suites_passed: 1,
      suites_failed: 0,
      suites_skipped: 1,
      tests: 5,
      passed: 5,
      failed: 0,
      skipped: 0,
    });
    // Progress keeps the stage and adds it to the timeline only once.
    expect(res.stage).toBe('Accounts');
    expect(res.stages.map((s) => s.name)).toEqual(['Running suites', 'Accounts']);
    expect(res.status).toBe('RUNNING');
    expect(post).not.toHaveBeenCalled();
  });

  it('a progress report without a stage keeps the current one', async () => {
    await runningRun();
    const res = await e2eRunService.report({ workflow_run_id: '500' }, 'ci');
    expect(res.stage).toBe('Running suites');
  });

  it('announces a red run once, naming the failing suites, and never again', async () => {
    await runningRun();
    for (let i = 0; i < 9; i += 1) {
      await e2eRunService.report(
        { workflow_run_id: '500', suite: { key: `leg-${i}`, status: 'FAILED', error: i === 0 ? 'boom <!here>' : '' } },
        'ci',
      );
    }
    await e2eRunService.report({ workflow_run_id: '500', suite: { key: 'leg-skip', status: 'SKIPPED' } }, 'ci');

    const res = await e2eRunService.report(
      { workflow_run_id: '500', status: 'FAILED', error_message: 'gate failed', duration_seconds: 1500, stage: 'Done' },
      'ci-gate',
    );

    expect(res).toMatchObject({
      status: 'FAILED',
      stage: '',
      error_message: 'gate failed',
      duration_seconds: 1500,
      slack_channel: 'C-E2E',
      slack_ts: '900.1',
      slack_error: null,
      reported_by: 'ci-gate',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0].channel).toBe('C-E2E');
    expect(post.mock.calls[0][0].text).toBe(`E2E failed — 9 of 10 suites red (${res.run_no})`);
    const text = postedText();
    expect(text).toContain('*leg-0* — boom &lt;!here&gt;');
    expect(text).toContain('*leg-7*');
    expect(text).not.toContain('*leg-8*');
    expect(text).toContain('… and 1 more');
    expect(text).toContain(':rotating_light: gate failed');
    expect(text).toContain('*Took:* 25 min');
    expect(text).toContain('*Not run:* 1 suites');
    expect(text).toContain('<https://github.com/acme/app/commit/abcdef1234567|abcdef1>');
    expect(text).toContain('"style":"danger"');
    expect(text).toContain('https://tech.example.test/e2e/runs');

    // The gate re-reporting the same outcome does not post a second time.
    await e2eRunService.report({ workflow_run_id: '500', status: 'FAILED' }, 'ci-gate');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('announces a green run with its pass count, and clears any earlier error', async () => {
    await runningRun({ commit_sha: '' });
    await e2eRunService.report({ workflow_run_id: '500', suite: { key: 'accounts', status: 'PASSED', tests: 4, passed: 4 } }, 'ci');
    const res = await e2eRunService.report(
      { workflow_run_id: '500', status: 'SUCCESS', error_message: 'ignored', workflow_run_url: RUN_URL, ref: 'main', commit_sha: 'f00d' },
      'ci',
    );
    expect(res).toMatchObject({ status: 'SUCCESS', error_message: '', ref: 'main', commit_sha: 'f00d' });
    expect(post.mock.calls[0][0].text).toBe(`E2E passed — 1 suites, 4/4 tests (${res.run_no})`);
    const text = postedText();
    expect(text).not.toContain('danger');
    expect(text).not.toContain('*Took:*');
  });

  it('records a skipped announcement when no channel is configured', async () => {
    delete mockEnv.SLACK_E2E_CHANNEL;
    await runningRun();
    const res = await e2eRunService.report({ workflow_run_id: '500', status: 'SUCCESS' }, 'ci');
    expect(res.slack_error).toBe('No Slack channel is configured for e2e results');
    expect(post).not.toHaveBeenCalled();
  });

  it('records why Slack refused, without failing the report', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    post.mockRejectedValueOnce(new Error('not_in_channel'));
    await runningRun();
    const res = await e2eRunService.report({ workflow_run_id: '500', status: 'SUCCESS' }, 'ci');
    expect(res.slack_error).toBe('not_in_channel');
    expect((await E2eRunModel.findById(res.id).lean<any>()).slack_error).toBe('not_in_channel');
    expect(logError).toHaveBeenCalledWith('e2eRun', 'announce', expect.objectContaining({ run_no: res.run_no }));
  });

  it('records a non-Error Slack failure, and logs a failure to persist the outcome', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    post.mockRejectedValueOnce('ratelimited');
    await runningRun();
    const realSave = E2eRunModel.prototype.save;
    jest
      .spyOn(E2eRunModel.prototype, 'save')
      .mockImplementationOnce(function (this: any, ...args: any[]) {
        return realSave.apply(this, args as any);
      })
      .mockRejectedValueOnce(new Error('write conflict'));
    const res = await e2eRunService.report({ workflow_run_id: '500', status: 'SUCCESS' }, 'ci');
    expect(res.slack_error).toBe('ratelimited');
    expect(logError).toHaveBeenCalledWith('e2eRun', 'saveOutcome', expect.objectContaining({ run_no: res.run_no }));
  });
});

describe('table and remove', () => {
  it('lists runs and filters on whether a Slack post exists', async () => {
    await E2eRunModel.collection.insertMany([
      { run_no: 'DUN-E2E-000101', status: 'SUCCESS', slack_ts: '1.1', created_at: new Date('2026-09-01T00:00:00.000Z') },
      { run_no: 'DUN-E2E-000102', status: 'FAILED', slack_ts: null, created_at: new Date('2026-09-02T00:00:00.000Z') },
    ]);
    const all = await e2eRunService.table({ page: 1, page_size: 10 });
    expect(all.rows.map((r) => r.run_no)).toEqual(['DUN-E2E-000102', 'DUN-E2E-000101']);
    // A legacy row with no totals still answers with the whole shape.
    expect(all.rows[0].totals).toEqual({
      suites: 0, suites_passed: 0, suites_failed: 0, suites_skipped: 0, tests: 0, passed: 0, failed: 0, skipped: 0,
    });
    const posted = await e2eRunService.table({ filters: [{ field: 'slack_ts', op: 'is_true' } as any] });
    expect(posted.rows.map((r) => r.run_no)).toEqual(['DUN-E2E-000101']);
  });

  it('remove deletes the row and every recording it held, carrying on past a file Slack will not delete', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    const doc = await E2eRunModel.create({
      run_no: 'DUN-E2E-000201',
      results: [{ key: 'accounts', video_file_id: 'F1' }, { key: 'no-surface', video_file_id: '' }],
      scenario_videos: [{ suite: 'accounts', title: 'signs up', file_id: 'F2' }],
    });
    removeFile.mockRejectedValueOnce(new Error('file_not_found'));

    expect(await e2eRunService.remove(String(doc._id))).toBe(true);

    expect(removeFile.mock.calls).toEqual([['F1'], ['F2']]);
    expect(warn).toHaveBeenCalledWith('e2eRun', 'forgetVideo', expect.objectContaining({ file_id: 'F1' }));
    expect(await E2eRunModel.countDocuments()).toBe(0);
  });

  it('remove answers false for a run that is not there', async () => {
    expect(await e2eRunService.remove('64b000000000000000000001')).toBe(false);
    expect(removeFile).not.toHaveBeenCalled();
  });

  it('suiteCatalogue returns copies of the catalogue', () => {
    const catalogue = e2eRunService.suiteCatalogue();
    expect(catalogue).toEqual(E2E_SUITES.map((s) => ({ ...s })));
    expect(catalogue[0]).not.toBe(E2E_SUITES[0]);
  });
});

describe('runIfDue', () => {
  it('does nothing while the schedule is off', async () => {
    configureGithub();
    expect(await e2eRunService.runIfDue(new Date())).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches an owed sweep, stamps the clock first, and prunes finished runs past the ceiling', async () => {
    configureGithub();
    await setSettings({ enabled: true, keep_last: 2, suites: ['accounts', 'retired-suite'], ref: 'staging' });
    await E2eRunModel.collection.insertMany([
      { run_no: 'DUN-E2E-000301', status: 'SUCCESS', created_at: new Date('2026-01-01T00:00:00.000Z'), results: [{ key: 'accounts', video_file_id: 'OLD-1' }], scenario_videos: [] },
      { run_no: 'DUN-E2E-000302', status: 'RUNNING', created_at: new Date('2026-01-02T00:00:00.000Z'), results: [], scenario_videos: [] },
      { run_no: 'DUN-E2E-000303', status: 'FAILED', created_at: new Date('2026-01-03T00:00:00.000Z'), results: [], scenario_videos: [] },
    ]);
    const now = new Date();

    const runNo = await e2eRunService.runIfDue(now);

    expect(runNo).toMatch(/^DUN-E2E-\d{6}$/);
    const created = await E2eRunModel.findOne({ run_no: runNo }).lean<any>();
    expect(created).toMatchObject({ trigger_source: 'SCHEDULE', triggered_by: 'schedule', requested_suites: ['accounts'] });
    expect(dispatch.mock.calls[0][3].suites).toBe('accounts');
    const settings = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>();
    expect(settings.last_run_at.getTime()).toBe(now.getTime());
    // Kept: the new run and the newest old one (by created_at), plus anything still live.
    const left = (await E2eRunModel.find({}).lean<any[]>()).map((r) => r.run_no).sort();
    expect(left).toEqual(['DUN-E2E-000302', 'DUN-E2E-000303', runNo].sort());
    expect(removeFile).toHaveBeenCalledWith('OLD-1');

    // Not owed again in the same window.
    expect(await e2eRunService.runIfDue(now)).toBeNull();
  });

  it('keeps the stamp even when GitHub refuses the scheduled dispatch', async () => {
    configureGithub();
    await setSettings({ enabled: true });
    dispatch.mockRejectedValueOnce(new Error('GitHub down'));
    const now = new Date();
    await expect(e2eRunService.runIfDue(now)).rejects.toThrow('GitHub down');
    const settings = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>();
    expect(settings.last_run_at.getTime()).toBe(now.getTime());
    expect(await E2eRunModel.countDocuments()).toBe(0);
  });
});
