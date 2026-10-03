/**
 * Tech → App Builds → Releases: settings and the live store page, against a
 * real database. The store readers, OpenAI advice and the notices are mocked;
 * the issue and settings documents and their dedupe / auto-close rules are real.
 */
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({ readAscConfig: jest.fn() }));
jest.mock('@modules/platform/appBuild/playRelease.service', () => ({
  playStoreSettings: jest.fn(),
  requirePlayConfig: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/storeRelease.apple', () => ({ listAppleReleases: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.play', () => ({ listPlayReleases: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.advice', () => ({ adviseIssue: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.notice', () => ({ notifyIssue: jest.fn() }));
jest.mock('@modules/platform/appBuild/appBuild.service', () => ({
  appBuildService: { pushToAppStore: jest.fn(), pushToPlayStore: jest.fn() },
}));

import { logs } from '@observability/log';
import { AppBuildModel } from '../../appBuild.model';
import { readAscConfig } from '../../iosSigning.service';
import { playStoreSettings, requirePlayConfig } from '../../playRelease.service';
import { listAppleReleases } from '../../storeRelease.apple';
import { listPlayReleases } from '../../storeRelease.play';
import { adviseIssue } from '../../storeRelease.advice';
import { notifyIssue } from '../../storeRelease.notice';
import { StoreReleaseIssueModel, StoreReleaseSettingsModel } from '../../storeRelease.model';
import type { StoreReleaseRow } from '../../storeRelease.rows';
import {
  getStoreReleaseSettings,
  pubIssue,
  pubSettings,
  storeReleases,
  updateStoreReleaseSettings,
} from '../../storeRelease.service';

const m = (fn: unknown) => fn as jest.Mock;
const ADVICE = {
  summary: 'Fix the privacy label',
  causes: ['Missing data-use disclosure'],
  steps: ['Update App Privacy'],
  next_time: ['Review labels before submitting'],
  confidence: 'high',
  model: 'gpt-test',
  generated_at: new Date('2026-01-02T00:00:00Z'),
  error: '',
};

const row = (over: Partial<StoreReleaseRow>): StoreReleaseRow => ({
  id: 'APP_STORE:v1',
  store: 'APP_STORE',
  version: '1.0.0',
  build_number: '10',
  state: 'READY_FOR_SALE',
  status: 'LIVE',
  track: '',
  review_state: '',
  created_at: '2026-01-01T00:00:00.000Z',
  submitted_at: null,
  rollout_pct: null,
  store_ref: 'v1',
  ...over,
});

/** Wait for the fire-and-forget announcement to finish its notices. */
const settle = async (done: () => boolean, rounds = 400) => {
  for (let i = 0; i < rounds && !done(); i += 1) await new Promise((r) => setTimeout(r, 5));
  await new Promise((r) => setTimeout(r, 5));
};

const issueDoc = (over: Record<string, unknown>) =>
  StoreReleaseIssueModel.create({
    store: 'APP_STORE',
    kind: 'REJECTION',
    source: 'STORE',
    version: '1.0.0',
    build_number: '10',
    state: 'REJECTED',
    store_ref: 'v1',
    dedupe_key: 'APP_STORE:REJECTION:1.0.0:10:REJECTED',
    detected_at: new Date('2026-01-01T00:00:00Z'),
    ...over,
  });

beforeEach(() => {
  for (const fn of [readAscConfig, playStoreSettings, requirePlayConfig, listAppleReleases, listPlayReleases, adviseIssue, notifyIssue]) {
    m(fn).mockReset();
  }
  m(adviseIssue).mockResolvedValue(ADVICE);
  m(notifyIssue).mockResolvedValue(undefined);
});

describe('release settings', () => {
  it('creates the singleton with its defaults once and returns the same document after', async () => {
    const first = await getStoreReleaseSettings();
    const second = await getStoreReleaseSettings();
    expect(String(second._id)).toBe(String(first._id));
    expect(await StoreReleaseSettingsModel.countDocuments()).toBe(1);
    expect(pubSettings(first)).toMatchObject({
      notify_enabled: true,
      slack_channel: '',
      mail_to: ['admin@duncit.com'],
      reminders_enabled: true,
      reminder_hours: 24,
      updated_by: '',
    });
    expect(pubSettings(first).updated_at).toBe(first.updated_at.toISOString());
    expect(pubSettings({ ...first.toObject(), updated_at: undefined } as never).updated_at).toBeNull();
  });

  it('saves trimmed, lower-cased, deduped addresses and the editor', async () => {
    const doc = await updateStoreReleaseSettings(
      {
        notify_enabled: false,
        slack_channel: '  C0123ABCD ',
        mail_to: [' Ops@Duncit.com', 'ops@duncit.com', '', 'qa@duncit.com'],
        reminders_enabled: false,
        reminder_hours: 168,
      },
      'tech@duncit.com'
    );
    expect(pubSettings(doc)).toMatchObject({
      notify_enabled: false,
      slack_channel: 'C0123ABCD',
      mail_to: ['ops@duncit.com', 'qa@duncit.com'],
      reminders_enabled: false,
      reminder_hours: 168,
      updated_by: 'tech@duncit.com',
    });
    expect(await StoreReleaseSettingsModel.countDocuments()).toBe(1);
  });

  it('accepts an empty (or missing) Slack channel and the minimum hours', async () => {
    const doc = await updateStoreReleaseSettings(
      { notify_enabled: true, slack_channel: undefined as never, mail_to: [], reminders_enabled: true, reminder_hours: 1 },
      'tech'
    );
    expect(doc.slack_channel).toBe('');
    expect(doc.mail_to).toEqual([]);
    expect(doc.reminder_hours).toBe(1);
  });

  it.each([
    [{ slack_channel: 'general' }, 'A Slack channel ID looks like C0123ABCD.'],
    [{ slack_channel: 'C12' }, 'A Slack channel ID looks like C0123ABCD.'],
    [{ mail_to: ['not-an-address'] }, 'One of the addresses is not a valid email address.'],
    [{ reminder_hours: 0 }, 'Reminder hours must be a whole number from 1 to 168.'],
    [{ reminder_hours: 169 }, 'Reminder hours must be a whole number from 1 to 168.'],
    [{ reminder_hours: 2.5 }, 'Reminder hours must be a whole number from 1 to 168.'],
  ])('rejects %p', async (patch, message) => {
    const input = { notify_enabled: true, slack_channel: '', mail_to: [], reminders_enabled: true, reminder_hours: 24, ...patch };
    await expect(updateStoreReleaseSettings(input, 'tech')).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await StoreReleaseSettingsModel.countDocuments()).toBe(0);
  });
});

describe('pubIssue', () => {
  it('serialises dates and hides advice that was never generated', async () => {
    const fresh = await issueDoc({});
    const out = pubIssue(fresh);
    expect(out).toMatchObject({
      store: 'APP_STORE',
      kind: 'REJECTION',
      detected_at: '2026-01-01T00:00:00.000Z',
      resolved_at: null,
      advice: null,
      notified_at: null,
      last_reminded_at: null,
      resubmitted_at: null,
      reminder_count: 0,
    });

    const at = new Date('2026-02-01T00:00:00Z');
    fresh.set({ advice: ADVICE, resolved_at: at, notified_at: at, last_reminded_at: at, resubmitted_at: at });
    const full = pubIssue(fresh);
    expect(full.advice).toEqual({ ...ADVICE, generated_at: '2026-01-02T00:00:00.000Z' });
    expect([full.resolved_at, full.notified_at, full.last_reminded_at, full.resubmitted_at]).toEqual(
      Array(4).fill('2026-02-01T00:00:00.000Z')
    );
  });
});

describe('storeReleases(APP_STORE)', () => {
  it('answers unconfigured with only the manually logged issues', async () => {
    m(readAscConfig).mockResolvedValue(null);
    await issueDoc({ source: 'MANUAL', state: 'MANUAL', version: '0.9.0', build_number: '', dedupe_key: 'manual-1' });
    await issueDoc({ version: '0.8.0', dedupe_key: 'store-1' });

    const page = await storeReleases('APP_STORE');
    expect(page).toMatchObject({ store: 'APP_STORE', configured: false, error: '', store_url: '', app_name: '' });
    expect(listAppleReleases).not.toHaveBeenCalled();
    // The STORE issue no live row matches is not resurrected; the MANUAL one is.
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0]).toMatchObject({ version: '0.9.0', status: 'REJECTED', build_no: '', track: '' });
    expect(page.rows[0].id).toMatch(/^APP_STORE:issue:/);
    expect(page.rows[0].issue?.source).toBe('MANUAL');
  });

  it('opens and announces one issue per rejected or awaiting version, and never duplicates it', async () => {
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    const rows = [
      row({ id: 'APP_STORE:v3', version: '1.2.0', build_number: '12', state: 'METADATA_REJECTED', status: 'REJECTED', store_ref: 'v3' }),
      row({ id: 'APP_STORE:v2', version: '1.1.0', build_number: '11', state: 'PENDING_DEVELOPER_RELEASE', status: 'APPROVED', store_ref: 'v2' }),
      row({}),
    ];
    m(listAppleReleases).mockResolvedValue({ appId: '1', appName: 'Duncit', url: 'https://asc/app', rows });
    await AppBuildModel.create({ build_no: 'DUN-BLD-000012', platform: 'IOS', build_number: '12' });

    const page = await storeReleases('APP_STORE');
    await settle(() => m(notifyIssue).mock.calls.length >= 2);

    expect(page).toMatchObject({ configured: true, error: '', store_url: 'https://asc/app', app_name: 'Duncit' });
    expect(page.rows.map((r) => [r.version, r.build_no, r.issue?.kind ?? null])).toEqual([
      ['1.2.0', 'DUN-BLD-000012', 'REJECTION'],
      ['1.1.0', '', 'AWAITING_RELEASE'],
      ['1.0.0', '', null],
    ]);
    const issues = await StoreReleaseIssueModel.find().sort({ version: 1 });
    expect(issues.map((i) => i.dedupe_key)).toEqual([
      'APP_STORE:AWAITING_RELEASE:1.1.0:11:PENDING_DEVELOPER_RELEASE',
      'APP_STORE:REJECTION:1.2.0:12:METADATA_REJECTED',
    ]);
    expect(issues.every((i) => i.advice.summary === ADVICE.summary)).toBe(true);
    expect(m(notifyIssue).mock.calls.map((c) => c[2])).toEqual(['NEW', 'NEW']);

    await storeReleases('APP_STORE');
    await settle(() => false, 20);
    expect(await StoreReleaseIssueModel.countDocuments()).toBe(2);
    expect(adviseIssue).toHaveBeenCalledTimes(2);
  });

  it('skips the notices when notifications are off', async () => {
    await updateStoreReleaseSettings(
      { notify_enabled: false, slack_channel: '', mail_to: [], reminders_enabled: true, reminder_hours: 24 },
      'tech'
    );
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    m(listAppleReleases).mockResolvedValue({
      appId: '1',
      appName: 'Duncit',
      url: 'u',
      rows: [row({ state: 'REJECTED', status: 'REJECTED' })],
    });
    await storeReleases('APP_STORE');
    await settle(() => m(adviseIssue).mock.calls.length > 0);
    await settle(() => false, 20);
    expect(adviseIssue).toHaveBeenCalledTimes(1);
    expect(notifyIssue).not.toHaveBeenCalled();
  });

  it('logs, without failing the page, when the announcement throws', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    m(adviseIssue).mockRejectedValue(new Error('openai down'));
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    m(listAppleReleases).mockResolvedValue({
      appId: '1',
      appName: 'Duncit',
      url: 'u',
      rows: [row({ state: 'INVALID_BINARY', status: 'REJECTED' })],
    });
    const page = await storeReleases('APP_STORE');
    await settle(() => error.mock.calls.some((c) => c[1] === 'releaseIssueAnnounce'));
    expect(page.error).toBe('');
    expect(error).toHaveBeenCalledWith('appBuild', 'releaseIssueAnnounce', expect.objectContaining({ issue: expect.any(String) }));
    error.mockRestore();
  });

  it('closes open store issues whose version moved on or disappeared', async () => {
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    const moved = await issueDoc({ store_ref: 'v1' });
    const gone = await issueDoc({ version: '0.5.0', store_ref: 'v0', dedupe_key: 'APP_STORE:REJECTION:0.5.0:10:REJECTED' });
    const manual = await issueDoc({ source: 'MANUAL', store_ref: 'v1', dedupe_key: 'manual' });
    m(listAppleReleases).mockResolvedValue({ appId: '1', appName: 'Duncit', url: 'u', rows: [row({})] });

    const page = await storeReleases('APP_STORE');
    const [movedNow, goneNow, manualNow] = await Promise.all(
      [moved, gone, manual].map((d) => StoreReleaseIssueModel.findById(d._id))
    );
    expect(movedNow?.resolved_reason).toBe('STATE_CHANGED:READY_FOR_SALE');
    expect(movedNow?.resolved_at).toBeInstanceOf(Date);
    expect(goneNow?.resolved_reason).toBe('VERSION_GONE');
    expect(manualNow?.resolved_at).toBeNull();
    // The open MANUAL issue wins the 1.0.0|10 slot over the resolved STORE one.
    expect(page.rows[0].issue?.source).toBe('MANUAL');
  });

  it.each([
    [new Error('ASC 401'), 'ASC 401'],
    ['plain failure', 'plain failure'],
  ])('reports a store read failure (%p) as the page error', async (thrown, message) => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    m(listAppleReleases).mockRejectedValue(thrown);
    const page = await storeReleases('APP_STORE');
    expect(page).toMatchObject({ configured: true, error: message, rows: [], store_url: '' });
    expect(error).toHaveBeenCalledWith('appBuild', 'appStoreReleases', { error: thrown });
    error.mockRestore();
  });
});

describe('storeReleases(GOOGLE_PLAY)', () => {
  it('answers unconfigured without reading Play', async () => {
    m(playStoreSettings).mockResolvedValue({ configured: false, packageName: '' });
    const page = await storeReleases('GOOGLE_PLAY');
    expect(page).toMatchObject({ store: 'GOOGLE_PLAY', configured: false, rows: [], error: '' });
    expect(requirePlayConfig).not.toHaveBeenCalled();
  });

  it('decorates Play rows with the build behind their first version code', async () => {
    m(playStoreSettings).mockResolvedValue({ configured: true, packageName: 'com.duncit' });
    m(requirePlayConfig).mockResolvedValue({ packageName: 'com.duncit' });
    m(listPlayReleases).mockResolvedValue({
      packageName: 'com.duncit',
      url: 'https://play/app',
      rows: [
        row({ id: 'GOOGLE_PLAY:r1', store: 'GOOGLE_PLAY', build_number: '7, 8', status: 'ROLLING_OUT', store_ref: 'r1' }),
        row({ id: 'GOOGLE_PLAY:r0', store: 'GOOGLE_PLAY', build_number: '', status: 'LIVE', store_ref: 'r0' }),
      ],
    });
    await AppBuildModel.create({ build_no: 'DUN-BLD-000007', platform: 'ANDROID', build_number: '7' });
    // Same number on the other platform must not be picked up.
    await AppBuildModel.create({ build_no: 'DUN-BLD-000008', platform: 'IOS', build_number: '8' });

    const page = await storeReleases('GOOGLE_PLAY');
    expect(page).toMatchObject({ configured: true, store_url: 'https://play/app', app_name: 'com.duncit', error: '' });
    expect(page.rows.map((r) => r.build_no)).toEqual(['DUN-BLD-000007', '']);
    expect(listPlayReleases).toHaveBeenCalledWith({ packageName: 'com.duncit' });
  });

  it('keeps the package name and reports the error when Play cannot be read', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    m(playStoreSettings).mockResolvedValue({ configured: true, packageName: 'com.duncit' });
    m(requirePlayConfig).mockRejectedValue(new Error('bad service account'));
    const page = await storeReleases('GOOGLE_PLAY');
    expect(page).toMatchObject({ configured: true, app_name: 'com.duncit', error: 'bad service account', rows: [] });
    expect(error).toHaveBeenCalledWith('appBuild', 'googlePlayReleases', expect.any(Object));
    error.mockRestore();
  });
});
