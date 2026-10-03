/**
 * The E2E Tests settings page and the run recordings, against a real database:
 * what the page shows, what Save writes (and refuses), the upload slot a CI leg
 * asks for, and sharing the recordings under the run's Slack announcement.
 *
 * Slack and runtime env are mocked; the settings singleton, the mute cache and
 * the run rows are real.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  ...jest.requireActual('@config/runtimeEnv'),
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));
jest.mock('@modules/platform/slack/slack.gateway', () => ({
  ...jest.requireActual('@modules/platform/slack/slack.gateway'),
  authStatus: jest.fn(),
  completeFileUpload: jest.fn(),
  ensureChannelMember: jest.fn().mockResolvedValue(undefined),
  getFileUploadUrl: jest.fn(),
  isSlackConfigured: jest.fn().mockResolvedValue(false),
}));

import { e2eRunService } from '../../e2eRun.service';
import { E2eRunModel, E2eRunSettingsModel, E2E_SETTINGS_KEY } from '../../e2eRun.model';
import { communicationsMuted } from '../../e2eRun.mute';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import {
  authStatus,
  completeFileUpload,
  ensureChannelMember,
  getFileUploadUrl,
  isSlackConfigured,
} from '@modules/platform/slack/slack.gateway';
import { logs } from '@observability/log';

const upload = completeFileUpload as jest.Mock;
const slackReady = isSlackConfigured as jest.Mock;
const scopes = authStatus as jest.Mock;
const uploadSlot = getFileUploadUrl as jest.Mock;

const validSettings = (over: Record<string, unknown> = {}) => ({
  enabled: false,
  frequency: 'DAILY',
  time_of_day: '04:30',
  weekday: 2,
  ref: 'staging',
  suites: ['accounts'],
  keep_last: 20,
  ...over,
});

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SERVER_URL = 'https://api.example.test/';
  slackReady.mockResolvedValue(false);
  upload.mockImplementation(async ({ files }: { files: Array<{ id: string }> }) =>
    files.map((f) => ({ id: f.id, permalink: `https://slack.example.test/${f.id}` })),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('settings', () => {
  it('creates the singleton with its defaults on first read', async () => {
    const res = await e2eRunService.settings();
    expect(res).toMatchObject({
      enabled: false,
      frequency: 'DAILY',
      time_of_day: '03:00',
      ref: 'staging',
      suites: [],
      keep_last: 100,
      password_set: false,
      record_videos: true,
      mute_communications: false,
      otp_bypass: false,
      can_upload_videos: null,
      slack_channel: null,
      slack_configured: false,
      login_email_preview: '',
      next_run_at: null,
      last_run_at: null,
      last_reported_at: null,
      last_reported_by: null,
    });
    expect(await E2eRunSettingsModel.countDocuments({ key: E2E_SETTINGS_KEY })).toBe(1);
  });

  it('shows the latest run that reported, the channel, and identity previews', async () => {
    mockEnv.SLACK_E2E_CHANNEL = ' C-E2E ';
    await E2eRunSettingsModel.create({ key: E2E_SETTINGS_KEY, email_prefix: 'qa', email_domain: 'example.com', password: 'x' });
    await E2eRunModel.collection.insertMany([
      { run_no: 'R1', reported_by: 'ci-old', created_at: new Date('2026-09-01T00:00:00.000Z') },
      { run_no: 'R2', reported_by: 'ci-new', created_at: new Date('2026-09-02T00:00:00.000Z') },
      { run_no: 'R3', reported_by: '', created_at: new Date('2026-09-03T00:00:00.000Z') },
    ]);
    const res = await e2eRunService.settings();
    expect(res.slack_channel).toBe('C-E2E');
    expect(res.password_set).toBe(true);
    expect(res.last_reported_at).toBe('2026-09-02T00:00:00.000Z');
    expect(res.last_reported_by).toBe('ci-new');
    expect(res.login_email_preview).toMatch(/^qa\d{12}@example\.com$/);
    expect(res.signup_email_preview).toBe(res.login_email_preview);
  });

  it.each([
    [{ scopes_known: false, scopes: [] }, true],
    [{ scopes_known: true, scopes: [{ scope: 'files:write', granted: true }] }, true],
    [{ scopes_known: true, scopes: [{ scope: 'files:write', granted: false }, { scope: 'chat:write', granted: true }] }, false],
  ])('judges the upload scope from %j', async (status, expected) => {
    slackReady.mockResolvedValue(true);
    scopes.mockResolvedValue(status);
    const res = await e2eRunService.settings();
    expect(res.slack_configured).toBe(true);
    expect(res.can_upload_videos).toBe(expected);
  });

  it('says nothing about the scope when Slack cannot be reached', async () => {
    slackReady.mockResolvedValue(true);
    scopes.mockRejectedValue(new Error('network'));
    expect((await e2eRunService.settings()).can_upload_videos).toBeNull();
  });
});

describe('updateSettings', () => {
  it.each([
    [{ time_of_day: '25:00' }, 'Time of day must be HH:mm, e.g. 03:00.'],
    [{ keep_last: 0 }, 'Keep at least one run.'],
    [{ keep_last: 'many' }, 'Keep at least one run.'],
    [{ ref: '  ' }, 'Pick a branch for scheduled runs.'],
    [{ suites: ['made-up'] }, 'Not a suite this repository runs: made-up'],
  ])('refuses %j and writes nothing', async (over, message) => {
    await expect(e2eRunService.updateSettings(validSettings(over))).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const doc = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>();
    expect(doc.time_of_day).toBe('03:00');
  });

  it.each([
    [null, 1],
    ['', 1],
    [0, 0],
    ['6', 6],
  ])('saves weekday %j as %j — a cleared weekday falls to Monday, Sunday (0) is kept', async (weekday, saved) => {
    const res = await e2eRunService.updateSettings(validSettings({ weekday }));
    expect(res.weekday).toBe(saved);
    const doc = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>();
    expect(doc.weekday).toBe(saved);
  });

  it('saves the form, strips a leading @ from the domain and keeps an unsent password', async () => {
    await e2eRunService.updateSettings(validSettings({ password: 'fake-first-password' }));
    const res = await e2eRunService.updateSettings(
      validSettings({ email_domain: '@example.com', email_prefix: ' qa ', identity_phone: ' 9000000000 ', weekday: undefined, record_videos: false }),
    );
    expect(res).toMatchObject({
      time_of_day: '04:30',
      weekday: 1,
      keep_last: 20,
      suites: ['accounts'],
      email_prefix: 'qa',
      email_domain: 'example.com',
      identity_phone: '9000000000',
      record_videos: false,
      password_set: true,
    });
    const doc = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>();
    expect(doc.password).toBe('fake-first-password');

    await e2eRunService.updateSettings(validSettings({ password: null }));
    expect((await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY }).lean<any>()).password).toBe('fake-first-password');
    await e2eRunService.updateSettings(validSettings({ password: '' }));
    expect((await e2eRunService.settings()).password_set).toBe(false);
  });

  it('starts the clock when the schedule is switched on, and only then', async () => {
    const before = Date.now();
    const on = await e2eRunService.updateSettings(validSettings({ enabled: true }));
    expect(on.enabled).toBe(true);
    expect(on.next_run_at).not.toBeNull();
    const stamped = new Date(on.last_run_at as string).getTime();
    expect(stamped).toBeGreaterThanOrEqual(before);

    const again = await e2eRunService.updateSettings(validSettings({ enabled: true, keep_last: 30 }));
    expect(again.last_run_at).toBe(on.last_run_at);
  });

  it('makes the communications mute take effect at once', async () => {
    expect(await communicationsMuted()).toBe(false);
    await e2eRunService.updateSettings(validSettings({ mute_communications: true, otp_bypass: true }));
    expect(await communicationsMuted()).toBe(true);
  });

  it('refuses a channel while Slack is not connected, and writes it beside the bot token once it is', async () => {
    await expect(e2eRunService.updateSettings(validSettings({ slack_channel: 'C-E2E' }))).rejects.toThrow(/Connect Slack first/);
    const entry = await EnvEntryModel.create({ name: 'Slack', category: 'SLACK', is_default: true, is_active: true, config: { bot_token: 'x' } });
    await e2eRunService.updateSettings(validSettings({ slack_channel: ' C-E2E ' }));
    expect((await EnvEntryModel.findById(entry._id).lean<any>()).config.e2e_channel).toBe('C-E2E');
  });
});

describe('triggerConfig', () => {
  it('reports whether GitHub is configured, the default branch and where runs report', async () => {
    expect(await e2eRunService.triggerConfig()).toEqual({
      configured: false,
      repository: '',
      default_ref: 'staging',
      reports_to: 'https://api.example.test/',
    });
    mockEnv.GITHUB_TOKEN = 'gh-test-token';
    mockEnv.GITHUB_OWNER = 'acme';
    mockEnv.GITHUB_REPO = 'app';
    expect(await e2eRunService.triggerConfig()).toMatchObject({ configured: true, repository: 'acme/app' });
  });
});

describe('videoUploadAuth', () => {
  const runRow = () => E2eRunModel.create({ run_no: 'DUN-E2E-000401', workflow_run_id: '700', status: 'RUNNING' });

  it('refuses a request no run matches', async () => {
    await expect(e2eRunService.videoUploadAuth({ workflow_run_id: 'x' })).rejects.toThrow(/No e2e run matches/);
  });

  it('answers with the reason when recording is off, there is no channel, or the file is empty', async () => {
    await runRow();
    await E2eRunSettingsModel.create({ key: E2E_SETTINGS_KEY, record_videos: false });
    expect((await e2eRunService.videoUploadAuth({ workflow_run_id: '700', length: 10 })).reason).toMatch(/Recording is switched off/);

    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: { record_videos: true } });
    expect(await e2eRunService.videoUploadAuth({ workflow_run_id: '700', length: 10 })).toEqual({
      ok: false,
      upload_url: '',
      file_id: '',
      reason: 'No Slack channel is configured for e2e results.',
    });

    mockEnv.SLACK_E2E_CHANNEL = 'C-E2E';
    expect((await e2eRunService.videoUploadAuth({ workflow_run_id: '700', length: 0 })).reason).toBe(
      'A recording with no bytes in it cannot be uploaded.',
    );
    expect(uploadSlot).not.toHaveBeenCalled();
  });

  it('hands out an upload slot named after the file, or the suite', async () => {
    await runRow();
    mockEnv.SLACK_E2E_CHANNEL = 'C-E2E';
    uploadSlot.mockResolvedValue({ upload_url: 'https://files.slack.example.test/up', file_id: 'F-NEW' });
    expect(await e2eRunService.videoUploadAuth({ workflow_run_id: '700', file_name: 'accounts-run.mp4', length: '2048' })).toEqual({
      ok: true,
      upload_url: 'https://files.slack.example.test/up',
      file_id: 'F-NEW',
      reason: '',
    });
    expect(uploadSlot).toHaveBeenCalledWith('accounts-run.mp4', 2048);
    await e2eRunService.videoUploadAuth({ workflow_run_id: '700', suite: 'accounts', length: 5 });
    expect(uploadSlot).toHaveBeenLastCalledWith('accounts.mp4', 5);
  });

  it('answers with Slack’s refusal instead of throwing', async () => {
    jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    await runRow();
    mockEnv.SLACK_E2E_CHANNEL = 'C-E2E';
    uploadSlot.mockRejectedValueOnce(new Error('missing_scope'));
    expect(await e2eRunService.videoUploadAuth({ workflow_run_id: '700', suite: 'accounts', length: 5 })).toMatchObject({
      ok: false,
      reason: 'missing_scope',
    });
    uploadSlot.mockRejectedValueOnce('quota');
    expect((await e2eRunService.videoUploadAuth({ workflow_run_id: '700', suite: 'accounts', length: 5 })).reason).toBe('quota');
  });
});

describe('attachVideos', () => {
  async function announcedRun(over: Record<string, unknown> = {}, legs = ['accounts', 'no-surface']) {
    return E2eRunModel.create({
      run_no: 'DUN-E2E-000501',
      workflow_run_id: '800',
      status: 'SUCCESS',
      slack_channel: 'C-E2E',
      slack_ts: '555.1',
      results: legs.map((key) => ({ key, status: 'PASSED' })),
      ...over,
    });
  }

  it('refuses a request no run matches', async () => {
    await expect(e2eRunService.attachVideos({ workflow_run_id: 'x' })).rejects.toThrow(/No e2e run matches/);
  });

  it('records why nothing could be shared when the run was never announced', async () => {
    await announcedRun({ slack_ts: null });
    const res = await e2eRunService.attachVideos({ workflow_run_id: '800', videos: [{ suite: 'accounts', file_id: 'F1' }] });
    expect(res.results.find((r) => r.key === 'accounts')!.video_file_id).toBe('F1');
    expect(res.video_error).toBe('The run was not announced, so there is no message to hang the recordings under.');
    expect(upload).not.toHaveBeenCalled();
  });

  it('shares nothing and records no error when no recording was attached', async () => {
    await announcedRun();
    const res = await e2eRunService.attachVideos({ workflow_run_id: '800', videos: 'not-a-list' });
    expect(res.video_error).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });

  it('hangs suite recordings and scenario clips under the announcement, in batches, saving permalinks', async () => {
    const legs = Array.from({ length: 11 }, (_, i) => `leg-${i}`);
    await announcedRun({}, legs);

    const res = await e2eRunService.attachVideos({
      workflow_run_id: '800',
      videos: [
        ...legs.map((suite, i) => ({ suite, file_id: `F${i}`, seconds: i === 0 ? 75 : null, bytes: 1000 })),
        { suite: '', file_id: 'ignored' },
        { suite: 'leg-0', file_id: ' ' },
      ],
      scenarios: [
        { suite: 'leg-0', title: 'signs up', state: 'passed', file_id: 'S1', seconds: 9.6 },
        { suite: 'leg-0', title: 'deletes account', file_id: 'S2' },
        { suite: 'leg-0', title: '', file_id: 'S3' },
      ],
    });

    expect(ensureChannelMember).toHaveBeenCalledWith('C-E2E');
    expect(upload).toHaveBeenCalledTimes(3);
    const [first, second, clips] = upload.mock.calls.map(([arg]) => arg);
    expect(first.files).toHaveLength(10);
    expect(first).toMatchObject({ channel: 'C-E2E', thread_ts: '555.1', initial_comment: 'Recordings for DUN-E2E-000501 — every suite, start to end.' });
    expect(first.files[0]).toEqual({ id: 'F0', title: 'leg-0 — passed · 1:15' });
    expect(first.files[1].title).toBe('leg-1 — passed');
    expect(second.files).toEqual([{ id: 'F10', title: 'leg-10 — passed' }]);
    expect(second.initial_comment).toBeUndefined();
    expect(clips.files).toEqual([
      { id: 'S1', title: 'leg-0 › signs up — passed · 0:10' },
      { id: 'S2', title: 'leg-0 › deletes account — recorded' },
    ]);
    expect(clips.initial_comment).toBe('Scenarios for DUN-E2E-000501 — one clip per test, in the order they ran.');

    expect(res.video_error).toBeNull();
    const leg0 = res.results.find((r) => r.key === 'leg-0')!;
    expect(leg0).toMatchObject({ video_file_id: 'F0', video_permalink: 'https://slack.example.test/F0', video_seconds: 75, video_bytes: 1000 });
    expect(res.results.find((r) => r.key === 'leg-10')!.video_permalink).toBe('https://slack.example.test/F10');
    expect(res.scenario_videos).toEqual([
      expect.objectContaining({ file_id: 'S1', permalink: 'https://slack.example.test/S1', state: 'passed', seconds: 9.6 }),
      expect.objectContaining({ file_id: 'S2', permalink: 'https://slack.example.test/S2', state: '' }),
    ]);
  });

  it('ignores a shared file Slack returns that no suite asked for', async () => {
    await announcedRun();
    upload.mockResolvedValueOnce([{ id: 'F-OTHER', permalink: 'https://slack.example.test/other' }]);
    const res = await e2eRunService.attachVideos({ workflow_run_id: '800', videos: [{ suite: 'accounts', file_id: 'F1' }] });
    expect(res.results.find((r) => r.key === 'accounts')!.video_permalink).toBe('');
    expect(res.video_error).toBeNull();
  });

  it('records a Slack failure on the run instead of throwing', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    await announcedRun();
    upload.mockRejectedValueOnce(new Error('storage_quota_exceeded'));
    const res = await e2eRunService.attachVideos({ workflow_run_id: '800', videos: [{ suite: 'accounts', file_id: 'F1' }] });
    expect(res.video_error).toBe('storage_quota_exceeded');
    expect(logError).toHaveBeenCalledWith('e2eRun', 'shareVideos', expect.objectContaining({ run_no: 'DUN-E2E-000501' }));

    upload.mockRejectedValueOnce('rate_limited');
    expect((await e2eRunService.attachVideos({ workflow_run_id: '800', videos: [] })).video_error).toBe('rate_limited');
  });
});
