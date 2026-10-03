/**
 * Tech → App Builds → Releases: what an operator does to an issue (log, annotate,
 * resolve, resubmit) and the scheduler's poll + reminders, against a real
 * database. Store readers, OpenAI advice, notices and the push are mocked.
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

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { AppBuildModel } from '../../appBuild.model';
import { appBuildService } from '../../appBuild.service';
import { readAscConfig } from '../../iosSigning.service';
import { listAppleReleases } from '../../storeRelease.apple';
import { adviseIssue } from '../../storeRelease.advice';
import { notifyIssue } from '../../storeRelease.notice';
import { StoreReleaseIssueModel } from '../../storeRelease.model';
import {
  logRejection,
  pollStoreReleases,
  resolveIssue,
  setReviewerMessage,
  submitLatestBuild,
  updateStoreReleaseSettings,
} from '../../storeRelease.service';

const m = (fn: unknown) => fn as jest.Mock;
const HOUR = 3_600_000;
const OPS: AuthUser = { id: 'user-1', email: 'ops@duncit.com', roles: ['TECH'] };
const NO_MAIL: AuthUser = { id: 'user-2', email: null, roles: ['TECH'] };
const ADVICE = {
  summary: 'Answer the reviewer',
  causes: ['Guideline 2.1'],
  steps: ['Reply in the Resolution Center'],
  next_time: [],
  confidence: 'medium',
  model: 'gpt-test',
  generated_at: new Date('2026-01-02T00:00:00Z'),
  error: '',
};

const issueDoc = (over: Record<string, unknown> = {}) =>
  StoreReleaseIssueModel.create({
    store: 'APP_STORE',
    kind: 'REJECTION',
    source: 'STORE',
    version: '1.0.0',
    build_number: '10',
    state: 'REJECTED',
    store_ref: 'v1',
    dedupe_key: `k-${new Types.ObjectId().toHexString()}`,
    detected_at: new Date(),
    ...over,
  });

const saveSettings = (over: Record<string, unknown> = {}) =>
  updateStoreReleaseSettings(
    { notify_enabled: true, slack_channel: '', mail_to: [], reminders_enabled: true, reminder_hours: 24, ...over } as never,
    'tech'
  );

beforeEach(() => {
  for (const fn of [readAscConfig, listAppleReleases, adviseIssue, notifyIssue, appBuildService.pushToAppStore, appBuildService.pushToPlayStore]) {
    m(fn).mockReset();
  }
  m(adviseIssue).mockResolvedValue(ADVICE);
  m(notifyIssue).mockResolvedValue(undefined);
});

describe('logRejection', () => {
  it('stores a trimmed MANUAL rejection, advises on it and sends the NEW notice', async () => {
    const issue = await logRejection(
      { store: 'GOOGLE_PLAY', version: ' 2.0.0 ', build_number: ' 77 ', reviewer_message: '  Policy: Data safety  ' },
      OPS
    );
    const saved = await StoreReleaseIssueModel.findById(issue._id).lean();
    expect(saved).toMatchObject({
      store: 'GOOGLE_PLAY',
      kind: 'REJECTION',
      source: 'MANUAL',
      version: '2.0.0',
      build_number: '77',
      state: 'MANUAL',
      reviewer_message: 'Policy: Data safety',
      store_ref: '2.0.0',
      detected_by: 'ops@duncit.com',
    });
    expect(saved?.dedupe_key).toMatch(/^GOOGLE_PLAY:MANUAL:2\.0\.0:\d+$/);
    expect(saved?.advice.summary).toBe(ADVICE.summary);
    expect(adviseIssue).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(m(notifyIssue).mock.calls[0][2]).toBe('NEW');
    expect(m(notifyIssue).mock.calls[0][1]).toMatchObject({ notify_enabled: true });
  });

  it('falls back to the user id and an empty build number', async () => {
    const issue = await logRejection({ store: 'APP_STORE', version: '1.0', build_number: null, reviewer_message: 'x' }, NO_MAIL);
    expect(issue.detected_by).toBe('user-2');
    expect(issue.build_number).toBe('');
  });

  it('does not notify when notifications are switched off', async () => {
    await saveSettings({ notify_enabled: false });
    await logRejection({ store: 'APP_STORE', version: '1.0', reviewer_message: 'x' }, OPS);
    expect(adviseIssue).toHaveBeenCalledTimes(1);
    expect(notifyIssue).not.toHaveBeenCalled();
  });

  it.each([
    [{ version: '  ', reviewer_message: 'x' }, 'Name the version that was rejected.'],
    [{ version: undefined, reviewer_message: 'x' }, 'Name the version that was rejected.'],
    [{ version: '1.0', reviewer_message: ' ' }, 'Paste what the reviewer said — the advice is written from it.'],
    [{ version: '1.0', reviewer_message: undefined }, 'Paste what the reviewer said — the advice is written from it.'],
  ])('rejects %p before writing anything', async (patch, message) => {
    await expect(logRejection({ store: 'APP_STORE', ...patch } as never, OPS)).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await StoreReleaseIssueModel.countDocuments()).toBe(0);
    expect(adviseIssue).not.toHaveBeenCalled();
  });
});

describe('setReviewerMessage', () => {
  it('keeps the reviewer words and regenerates the advice with them', async () => {
    const issue = await issueDoc();
    const updated = await setReviewerMessage(String(issue._id), '  Guideline 4.3 spam  ', OPS);
    expect(updated.reviewer_message).toBe('Guideline 4.3 spam');
    const saved = await StoreReleaseIssueModel.findById(issue._id).lean();
    expect(saved?.reviewer_message).toBe('Guideline 4.3 spam');
    expect(saved?.advice.causes).toEqual(['Guideline 2.1']);
    expect(m(adviseIssue).mock.calls[0][0].reviewer_message).toBe('Guideline 4.3 spam');
    expect(m(adviseIssue).mock.calls[0][1]).toBe('user-1');
  });

  it('clears the message when none is given', async () => {
    const issue = await issueDoc({ reviewer_message: 'old' });
    const updated = await setReviewerMessage(String(issue._id), undefined as never, OPS);
    expect(updated.reviewer_message).toBe('');
  });

  it('refuses an issue that does not exist', async () => {
    await expect(setReviewerMessage(new Types.ObjectId().toHexString(), 'x', OPS)).rejects.toMatchObject({
      message: 'That issue no longer exists.',
    });
    expect(adviseIssue).not.toHaveBeenCalled();
  });
});

describe('resolveIssue', () => {
  it('closes an open issue in the operator name, falling back to the id', async () => {
    const a = await issueDoc();
    const b = await issueDoc();
    expect((await resolveIssue(String(a._id), OPS)).resolved_reason).toBe('BY:ops@duncit.com');
    expect((await resolveIssue(String(b._id), NO_MAIL)).resolved_reason).toBe('BY:user-2');
    expect((await StoreReleaseIssueModel.findById(a._id).lean())?.resolved_at).toBeInstanceOf(Date);
  });

  it('leaves an already-resolved issue as it was', async () => {
    const at = new Date('2026-01-05T00:00:00Z');
    const issue = await issueDoc({ resolved_at: at, resolved_reason: 'VERSION_GONE' });
    const same = await resolveIssue(String(issue._id), OPS);
    expect(same.resolved_reason).toBe('VERSION_GONE');
    expect(same.resolved_at?.toISOString()).toBe(at.toISOString());
  });

  it('refuses an unknown issue', async () => {
    await expect(resolveIssue(new Types.ObjectId().toHexString(), OPS)).rejects.toThrow('That issue no longer exists.');
  });
});

describe('submitLatestBuild', () => {
  const insertBuilds = async () => {
    const ids = { oldIos: new Types.ObjectId(), newIos: new Types.ObjectId(), android: new Types.ObjectId() };
    await AppBuildModel.collection.insertMany([
      { _id: ids.oldIos, build_no: 'DUN-BLD-1', platform: 'IOS', status: 'SUCCESS', app_env: 'PRODUCTION', artifacts: [{ kind: 'IPA', file_id: 'f1' }], created_at: new Date('2026-01-01T00:00:00Z') },
      { _id: ids.newIos, build_no: 'DUN-BLD-2', platform: 'IOS', status: 'SUCCESS', app_env: 'PRODUCTION', artifacts: [{ kind: 'IPA', file_id: 'f2' }], created_at: new Date('2026-01-03T00:00:00Z') },
      // Newer but not eligible: failed, staging, or no stored artifact.
      { _id: new Types.ObjectId(), build_no: 'DUN-BLD-3', platform: 'IOS', status: 'FAILED', app_env: 'PRODUCTION', artifacts: [{ kind: 'IPA', file_id: 'f3' }], created_at: new Date('2026-01-04T00:00:00Z') },
      { _id: new Types.ObjectId(), build_no: 'DUN-BLD-4', platform: 'IOS', status: 'SUCCESS', app_env: 'STAGING', artifacts: [{ kind: 'IPA', file_id: 'f4' }], created_at: new Date('2026-01-05T00:00:00Z') },
      { _id: new Types.ObjectId(), build_no: 'DUN-BLD-5', platform: 'IOS', status: 'SUCCESS', app_env: 'PRODUCTION', artifacts: [{ kind: 'IPA', file_id: '' }], created_at: new Date('2026-01-06T00:00:00Z') },
      { _id: ids.android, build_no: 'DUN-BLD-6', platform: 'ANDROID', status: 'SUCCESS', app_env: 'PRODUCTION', artifacts: [{ kind: 'AAB', file_id: 'f6' }], created_at: new Date('2026-01-02T00:00:00Z') },
    ]);
    return ids;
  };

  it('pushes the newest eligible iOS build to the App Store and marks the open App Store issues', async () => {
    const ids = await insertBuilds();
    m(appBuildService.pushToAppStore).mockResolvedValue({ pushed: 'ios' });
    const open = await issueDoc();
    const closed = await issueDoc({ resolved_at: new Date() });
    const play = await issueDoc({ store: 'GOOGLE_PLAY' });

    expect(await submitLatestBuild('APP_STORE', OPS)).toEqual({ pushed: 'ios' });
    expect(appBuildService.pushToAppStore).toHaveBeenCalledWith(String(ids.newIos), 'APP_STORE', OPS);
    expect(appBuildService.pushToPlayStore).not.toHaveBeenCalled();

    const [o, c, p] = await Promise.all([open, closed, play].map((d) => StoreReleaseIssueModel.findById(d._id).lean()));
    expect(o).toMatchObject({ resubmitted_build_no: 'DUN-BLD-2', resubmitted_by: 'ops@duncit.com' });
    expect(o?.resubmitted_at).toBeInstanceOf(Date);
    expect(c?.resubmitted_build_no).toBe('');
    expect(p?.resubmitted_build_no).toBe('');
  });

  it('pushes the Android AAB to the Play production track, crediting the user id without an email', async () => {
    const ids = await insertBuilds();
    m(appBuildService.pushToPlayStore).mockResolvedValue({ pushed: 'android' });
    const open = await issueDoc({ store: 'GOOGLE_PLAY' });
    await submitLatestBuild('GOOGLE_PLAY', NO_MAIL);
    expect(appBuildService.pushToPlayStore).toHaveBeenCalledWith(String(ids.android), 'PRODUCTION', NO_MAIL);
    expect((await StoreReleaseIssueModel.findById(open._id).lean())?.resubmitted_by).toBe('user-2');
  });

  it('refuses when there is no eligible build, without pushing', async () => {
    await expect(submitLatestBuild('GOOGLE_PLAY', OPS)).rejects.toMatchObject({
      message: 'There is no successful production ANDROID build with a stored AAB to submit.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(appBuildService.pushToPlayStore).not.toHaveBeenCalled();
  });

  it('does not mark issues when the push itself fails', async () => {
    await insertBuilds();
    m(appBuildService.pushToAppStore).mockRejectedValue(new Error('push already running'));
    const open = await issueDoc();
    await expect(submitLatestBuild('APP_STORE', OPS)).rejects.toThrow('push already running');
    expect((await StoreReleaseIssueModel.findById(open._id).lean())?.resubmitted_build_no).toBe('');
  });
});

describe('pollStoreReleases', () => {
  it('reminds only about open issues untold for longer than the window', async () => {
    m(readAscConfig).mockResolvedValue(null);
    const now = Date.now();
    const due = await issueDoc({ detected_at: new Date(now - 30 * HOUR) });
    await issueDoc({ detected_at: new Date(now - 30 * HOUR), notified_at: new Date(now - 2 * HOUR) });
    await issueDoc({ detected_at: new Date(now - 90 * HOUR), last_reminded_at: new Date(now - HOUR) });
    const remindedLongAgo = await issueDoc({
      detected_at: new Date(now - 90 * HOUR),
      notified_at: new Date(now - 80 * HOUR),
      last_reminded_at: new Date(now - 25 * HOUR),
    });
    await issueDoc({ detected_at: new Date(now - 90 * HOUR), resolved_at: new Date(now - HOUR) });

    await pollStoreReleases();

    expect(listAppleReleases).not.toHaveBeenCalled();
    const told = m(notifyIssue).mock.calls.map((c) => String(c[0]._id)).sort((a, b) => a.localeCompare(b));
    expect(told).toEqual([String(due._id), String(remindedLongAgo._id)].sort((a, b) => a.localeCompare(b)));
    expect(m(notifyIssue).mock.calls.every((c) => c[2] === 'REMINDER')).toBe(true);
  });

  it.each([
    [{ reminders_enabled: false }],
    [{ notify_enabled: false }],
  ])('sends no reminders when %p', async (patch) => {
    m(readAscConfig).mockResolvedValue(null);
    await saveSettings(patch);
    await issueDoc({ detected_at: new Date(Date.now() - 100 * HOUR) });
    await pollStoreReleases();
    expect(notifyIssue).not.toHaveBeenCalled();
  });

  it('honours a custom reminder window', async () => {
    m(readAscConfig).mockResolvedValue(null);
    await saveSettings({ reminder_hours: 2 });
    await issueDoc({ detected_at: new Date(Date.now() - 3 * HOUR) });
    await pollStoreReleases();
    expect(notifyIssue).toHaveBeenCalledTimes(1);
  });

  it('syncs Apple when connected, opening issues for rejected versions', async () => {
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    m(listAppleReleases).mockResolvedValue({
      appId: '1',
      appName: 'Duncit',
      url: 'u',
      rows: [
        {
          id: 'APP_STORE:v9', store: 'APP_STORE', version: '9.0.0', build_number: '90', state: 'REJECTED', status: 'REJECTED',
          track: '', review_state: 'UNRESOLVED_ISSUES', created_at: null, submitted_at: null, rollout_pct: null, store_ref: 'v9',
        },
      ],
    });
    await pollStoreReleases();
    for (let i = 0; i < 400 && m(notifyIssue).mock.calls.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    const issue = await StoreReleaseIssueModel.findOne({ store_ref: 'v9' }).lean();
    expect(issue).toMatchObject({ kind: 'REJECTION', source: 'STORE', review_state: 'UNRESOLVED_ISSUES', resolved_at: null });
    expect(m(notifyIssue).mock.calls[0][2]).toBe('NEW');
  });

  it('logs an Apple read failure and still sends the reminders', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    m(readAscConfig).mockResolvedValue({ keyId: 'k' });
    m(listAppleReleases).mockRejectedValue(new Error('ASC timeout'));
    await issueDoc({ detected_at: new Date(Date.now() - 48 * HOUR) });
    await pollStoreReleases();
    expect(error).toHaveBeenCalledWith('appBuild', 'releasePoll', { error: expect.any(Error) });
    expect(m(notifyIssue).mock.calls.map((c) => c[2])).toEqual(['REMINDER']);
    error.mockRestore();
  });
});
