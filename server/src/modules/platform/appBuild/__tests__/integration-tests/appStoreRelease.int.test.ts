/**
 * The App Store push state machine against a real database.
 *
 * Every App Store Connect gateway, the ASC config, the Store Listing read and
 * the Slack announcement are mocked; the build row and its positional writes
 * are real. `drive` runs detached from the call that starts it, so each test
 * waits on what the row (or the last call of a path) shows, never on a timer.
 */
jest.mock('@modules/platform/appBuild/appStoreConnect.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/appStoreConnect.gateway'),
  ascToken: jest.fn(() => 'asc-token'),
  findApp: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/iosSigning.service'),
  requireAscConfig: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/ascBuildUpload.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/ascBuildUpload.gateway'),
  findBuild: jest.fn(),
  createBuildUpload: jest.fn(),
  reserveBuildUploadFile: jest.fn(),
  putFileParts: jest.fn(),
  commitBuildUploadFile: jest.fn(),
  deleteBuildUpload: jest.fn(),
  readBuildUpload: jest.fn(),
  readBuildProcessingState: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/ascListing.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/ascListing.gateway'),
  editableAppInfo: jest.fn(),
  upsertAppInfoLocalization: jest.fn(),
  setPrimaryCategory: jest.fn(),
  ensureAppStoreVersion: jest.fn(),
  upsertVersionLocalization: jest.fn(),
  upsertReviewDetail: jest.fn(),
  attachBuild: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/ascScreenshots.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/ascScreenshots.gateway'),
  syncScreenshotSet: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/ascReview.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/ascReview.gateway'),
  openReviewSubmission: jest.fn(),
  addVersionToSubmission: jest.fn(),
  submitForReview: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/storeListing.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/storeListing.service'),
  getStoreListing: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/storeAssets', () => ({
  ...jest.requireActual('@modules/platform/appBuild/storeAssets'),
  fetchStoreAssets: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/releaseGuards', () => ({
  ...jest.requireActual('@modules/platform/appBuild/releaseGuards'),
  storedArtifactPath: jest.fn(),
  announceRelease: jest.fn(),
}));

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logs } from '@observability/log';
import { AppBuildModel } from '../../appBuild.model';
import { pushBuildToAppStore, resumeAppStoreReleases } from '../../appStoreRelease.service';
import { AscError, findApp } from '../../appStoreConnect.gateway';
import { requireAscConfig } from '../../iosSigning.service';
import * as uploads from '../../ascBuildUpload.gateway';
import * as listings from '../../ascListing.gateway';
import { syncScreenshotSet } from '../../ascScreenshots.gateway';
import { addVersionToSubmission, openReviewSubmission, submitForReview } from '../../ascReview.gateway';
import { getStoreListing } from '../../storeListing.service';
import { fetchStoreAssets } from '../../storeAssets';
import { announceRelease, storedArtifactPath } from '../../releaseGuards';

const m = (fn: unknown) => fn as jest.Mock;
const announce = m(announceRelease);

const STAGE = {
  UPLOAD: 'Uploading the IPA to App Store Connect',
  PROCESSING: 'Waiting for Apple to process the build',
  LISTING: 'Applying the store listing',
  SUBMIT: 'Submitting for App Review',
};
const BY = 'ops@example.com';
const HOUR = 3_600_000;

let tmpDir = '';
let ipaPath = '';

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asc-release-'));
  ipaPath = path.join(tmpDir, 'duncit-ios.ipa');
  fs.writeFileSync(ipaPath, 'ipa-bytes');
});
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Every gateway mock, reset before each test so no queued answer leaks into the next one. */
const GATEWAYS = [
  findApp,
  requireAscConfig,
  uploads.findBuild,
  uploads.createBuildUpload,
  uploads.reserveBuildUploadFile,
  uploads.putFileParts,
  uploads.commitBuildUploadFile,
  uploads.deleteBuildUpload,
  uploads.readBuildUpload,
  uploads.readBuildProcessingState,
  listings.editableAppInfo,
  listings.upsertAppInfoLocalization,
  listings.setPrimaryCategory,
  listings.ensureAppStoreVersion,
  listings.upsertVersionLocalization,
  listings.upsertReviewDetail,
  listings.attachBuild,
  syncScreenshotSet,
  openReviewSubmission,
  addVersionToSubmission,
  submitForReview,
  getStoreListing,
  fetchStoreAssets,
  storedArtifactPath,
  announceRelease,
];

let warn: jest.SpyInstance;
beforeEach(() => {
  for (const fn of GATEWAYS) m(fn).mockReset();
  warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
  m(requireAscConfig).mockResolvedValue({ creds: { issuerId: 'i', keyId: 'k', privateKey: 'p' }, bundleId: 'com.example.app' });
  m(storedArtifactPath).mockResolvedValue(ipaPath);
  announce.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

/** Poll until `check` holds — `drive` is fire-and-forget. */
async function until(check: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('condition not reached in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
/** Let a drive that has made its last observable call unwind (it holds an in-process lock until then). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

const makeBuild = (over: Record<string, unknown> = {}) =>
  AppBuildModel.create({
    build_no: 'IOS-1',
    platform: 'IOS',
    status: 'SUCCESS',
    app_env: 'PRODUCTION',
    version: '1.5.0',
    build_number: '42',
    artifacts: [{ kind: 'IPA', name: 'duncit.ipa', file_id: 'duncit.ipa' }],
    ...over,
  });

const entry = (over: Record<string, unknown> = {}) => ({
  track: 'TESTFLIGHT',
  status: 'PUSHING',
  step: 'UPLOAD',
  stage: STAGE.UPLOAD,
  by: BY,
  started_at: new Date(Date.now() - 10 * 60_000),
  heartbeat_at: new Date(Date.now() - 10 * 60_000),
  ...over,
});

/** A build already mid-push, its heartbeat stale so the scheduler picks it up. */
const seeded = (...entries: Record<string, unknown>[]) => makeBuild({ app_store_releases: entries });

const release = async (id: string, index = 0) =>
  ((await AppBuildModel.findById(id).lean()) as any).app_store_releases[index];

const finished = async (id: string, index = 0) => {
  await until(async () => (await release(id, index)).status !== 'PUSHING');
  await settle();
};

const completeListing = (over: Record<string, unknown> = {}) => ({
  locale: '',
  name: 'Duncit',
  subtitle: 'Meet people',
  description: 'Find your people.',
  keywords: 'pods,clubs',
  whats_new: 'Bug fixes',
  privacy_policy_url: 'https://example.com/privacy',
  support_url: 'https://example.com/support',
  marketing_url: '',
  copyright: '2026 Duncit',
  primary_category: 'SOCIAL_NETWORKING',
  contact_email: 'review@example.com',
  contact_phone: '+910000000000',
  review_first_name: 'Rev',
  review_last_name: 'Iewer',
  demo_account_required: false,
  demo_account_name: '',
  demo_account_password: '',
  review_notes: 'none',
  iphone_screenshots: ['https://cdn/iphone-1.png'],
  ipad_screenshots: ['https://cdn/ipad-1.png'],
  ...over,
});

describe('pushBuildToAppStore — refusals', () => {
  it.each([
    [{ platform: 'ANDROID' }, 'Only iOS builds can go to App Store Connect.'],
    [{ status: 'FAILED' }, 'Only a finished, successful build can go to App Store Connect.'],
    [{ app_env: 'STAGING' }, 'Only a production build can go to App Store Connect — this one talks to staging.'],
    [{ build_number: '' }, expect.stringContaining('build number')],
  ])('refuses a build with %o', async (over, message) => {
    const build = await makeBuild(over);
    await expect(pushBuildToAppStore(build.id, 'TESTFLIGHT', BY)).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect((await AppBuildModel.findById(build.id).lean())?.app_store_releases).toHaveLength(0);
  });

  it('refuses a build that does not exist', async () => {
    await expect(pushBuildToAppStore('64b0000000000000000000ff', 'TESTFLIGHT', BY)).rejects.toMatchObject({
      message: 'That build no longer exists',
    });
  });

  it('refuses a second push while one is in progress', async () => {
    const build = await seeded(entry({ heartbeat_at: new Date() }));
    await expect(pushBuildToAppStore(build.id, 'TESTFLIGHT', BY)).rejects.toMatchObject({
      message: 'A push to App Store Connect is already in progress for IOS-1.',
    });
  });

  it('refuses when the stored IPA is gone or App Store Connect is not configured', async () => {
    const build = await makeBuild();
    m(storedArtifactPath).mockRejectedValueOnce(new Error('This build’s IPA is no longer in the build store.'));
    await expect(pushBuildToAppStore(build.id, 'TESTFLIGHT', BY)).rejects.toThrow('no longer in the build store');

    m(requireAscConfig).mockRejectedValueOnce(new Error('App Store Connect is not configured'));
    await expect(pushBuildToAppStore(build.id, 'TESTFLIGHT', BY)).rejects.toThrow('not configured');
    expect((await AppBuildModel.findById(build.id).lean())?.app_store_releases).toHaveLength(0);
  });

  it('refuses an App Review push while the Store Listing is incomplete, at the click', async () => {
    const build = await makeBuild();
    m(getStoreListing).mockResolvedValue(completeListing({ support_url: '', ipad_screenshots: [] }));
    await expect(pushBuildToAppStore(build.id, 'APP_STORE', BY)).rejects.toMatchObject({
      message: expect.stringContaining('support URL, iPad screenshots'),
    });
    expect((await AppBuildModel.findById(build.id).lean())?.app_store_releases).toHaveLength(0);
  });
});

describe('pushBuildToAppStore — TestFlight, start to finish', () => {
  it('uploads the IPA, waits out processing and announces the build on TestFlight', async () => {
    const build = await makeBuild();
    m(findApp).mockResolvedValue({ id: 'app-1', name: 'Duncit' });
    m(uploads.findBuild).mockResolvedValue(null);
    m(uploads.createBuildUpload).mockResolvedValue('upload-1');
    m(uploads.reserveBuildUploadFile).mockResolvedValue({ id: 'file-1', operations: [{ url: 'https://put' }] });
    // The part uploader beats the heartbeat as it goes.
    m(uploads.putFileParts).mockImplementation(async (_path: string, _ops: unknown, beat: () => Promise<void>) => beat());
    m(uploads.commitBuildUploadFile).mockResolvedValue(undefined);
    m(uploads.readBuildUpload).mockResolvedValue({ state: 'COMPLETE', errors: [], buildId: 'asc-build-1' });
    m(uploads.readBuildProcessingState).mockResolvedValue('VALID');

    const started = await pushBuildToAppStore(build.id, 'TESTFLIGHT', BY);

    // The call returns the row already showing the push.
    const first = JSON.parse(JSON.stringify(started.app_store_releases[0]));
    expect(first).toEqual(expect.objectContaining({ track: 'TESTFLIGHT', status: 'PUSHING', step: 'UPLOAD', stage: STAGE.UPLOAD, by: BY }));
    expect(getStoreListing).not.toHaveBeenCalled();

    await finished(build.id);
    const done = await release(build.id);
    expect(done).toEqual(
      expect.objectContaining({
        status: 'RELEASED',
        step: 'DONE',
        stage: '',
        error: '',
        asc_app_id: 'app-1',
        build_upload_id: 'upload-1',
        asc_build_id: 'asc-build-1',
      })
    );
    expect(done.finished_at).toBeInstanceOf(Date);
    expect(findApp).toHaveBeenCalledWith('asc-token', 'com.example.app');
    expect(uploads.findBuild).toHaveBeenCalledWith('asc-token', 'app-1', '1.5.0', '42');
    expect(uploads.createBuildUpload).toHaveBeenCalledWith('asc-token', 'app-1', '1.5.0', '42');
    expect(uploads.reserveBuildUploadFile).toHaveBeenCalledWith('asc-token', 'upload-1', 'duncit-ios.ipa', 9);
    expect(uploads.commitBuildUploadFile).toHaveBeenCalledWith('asc-token', 'file-1');
    expect(uploads.readBuildUpload).toHaveBeenCalledWith('asc-token', 'upload-1');
    expect(uploads.readBuildProcessingState).toHaveBeenCalledWith('asc-token', 'asc-build-1');

    await until(() => announce.mock.calls.length > 0);
    expect(announce).toHaveBeenCalledWith(
      'SLACK_IOS_BUILDS_CHANNEL',
      `:rocket: iOS v1.5.0 build 42 (IOS-1) is processed and on TestFlight — pushed by ${BY}`,
      'IOS-1'
    );
    expect(warn).toHaveBeenCalledWith('appBuild', 'appStoreRelease', expect.objectContaining({ build_no: 'IOS-1', error: '' }));
  });

  it('fails the push, naming the fix, when no App Store Connect app uses the bundle ID', async () => {
    const build = await makeBuild();
    m(findApp).mockResolvedValue(null);

    await pushBuildToAppStore(build.id, 'TESTFLIGHT', BY);
    await finished(build.id);

    const failed = await release(build.id);
    expect(failed.status).toBe('FAILED');
    expect(failed.step).toBe('UPLOAD');
    expect(failed.error).toBe('No App Store Connect app uses com.example.app yet — create it under Apps → New App first.');
    await until(() => announce.mock.calls.length > 0);
    expect(announce.mock.calls[0][1]).toBe(
      ':x: iOS v1.5.0 build 42 (IOS-1) could not be pushed to TestFlight — No App Store Connect app uses com.example.app yet — create it under Apps → New App first.'
    );
  });
});

describe('resumeAppStoreReleases — each step', () => {
  it('skips the upload when Apple already holds the build, and waits for its processing', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1' }));
    m(uploads.findBuild).mockResolvedValue({ id: 'asc-build-9' });
    m(uploads.readBuildProcessingState).mockResolvedValue('PROCESSING');

    await resumeAppStoreReleases();
    await until(async () => (await release(build.id)).step === 'PROCESSING' && m(uploads.readBuildProcessingState).mock.calls.length > 0);
    await settle();

    const row = await release(build.id);
    expect(row).toEqual(expect.objectContaining({ status: 'PUSHING', asc_build_id: 'asc-build-9', stage: STAGE.PROCESSING }));
    expect(findApp).not.toHaveBeenCalled();
    expect(uploads.createBuildUpload).not.toHaveBeenCalled();
    expect(uploads.readBuildUpload).not.toHaveBeenCalled();
  });

  it('carries on from an upload Apple already received instead of uploading again', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1', build_upload_id: 'upload-0' }));
    m(uploads.findBuild).mockResolvedValue(null);
    m(uploads.readBuildUpload)
      .mockResolvedValueOnce({ state: 'COMPLETE', errors: [], buildId: '' })
      .mockResolvedValueOnce({ state: 'PROCESSING', errors: [], buildId: '' });

    await resumeAppStoreReleases();
    await until(() => m(uploads.readBuildUpload).mock.calls.length === 2);
    await settle();

    expect((await release(build.id)).step).toBe('PROCESSING');
    expect(uploads.createBuildUpload).not.toHaveBeenCalled();
    expect(uploads.deleteBuildUpload).not.toHaveBeenCalled();
  });

  it('discards a half-finished upload and starts the IPA over, logging a failed discard', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1', build_upload_id: 'upload-0' }));
    m(uploads.findBuild).mockResolvedValue(null);
    m(uploads.readBuildUpload)
      .mockResolvedValueOnce({ state: 'AWAITING_UPLOAD', errors: [], buildId: '' })
      .mockResolvedValueOnce({ state: 'PROCESSING', errors: [], buildId: '' });
    m(uploads.deleteBuildUpload).mockRejectedValue(new Error('gone already'));
    m(uploads.createBuildUpload).mockResolvedValue('upload-1');
    m(uploads.reserveBuildUploadFile).mockResolvedValue({ id: 'file-1', operations: [] });
    m(uploads.putFileParts).mockResolvedValue(undefined);
    m(uploads.commitBuildUploadFile).mockResolvedValue(undefined);

    await resumeAppStoreReleases();
    await until(() => m(uploads.readBuildUpload).mock.calls.length === 2);
    await settle();

    expect(uploads.deleteBuildUpload).toHaveBeenCalledWith('asc-token', 'upload-0');
    expect(warn).toHaveBeenCalledWith('appBuild', 'appStoreUploadDiscard', expect.objectContaining({ build_no: 'IOS-1' }));
    const row = await release(build.id);
    expect(row).toEqual(expect.objectContaining({ status: 'PUSHING', step: 'PROCESSING', build_upload_id: 'upload-1' }));
    expect(m(uploads.readBuildUpload).mock.calls[1]).toEqual(['asc-token', 'upload-1']);
  });

  it.each([
    [['Invalid signature', 'Missing icon'], 'Apple rejected the upload: Invalid signature; Missing icon'],
    [[], 'Apple rejected the upload: no reason given'],
  ])('fails when Apple rejects the upload (%p)', async (errors, message) => {
    const build = await seeded(entry({ step: 'PROCESSING', stage: STAGE.PROCESSING, build_upload_id: 'upload-1' }));
    m(uploads.readBuildUpload).mockResolvedValue({ state: 'FAILED', errors, buildId: '' });

    await resumeAppStoreReleases();
    await finished(build.id);

    expect(await release(build.id)).toEqual(expect.objectContaining({ status: 'FAILED', error: message, step: 'PROCESSING' }));
  });

  it('fails when Apple marks the processed build invalid', async () => {
    const build = await seeded(entry({ step: 'PROCESSING', stage: STAGE.PROCESSING, asc_build_id: 'asc-build-1' }));
    m(uploads.readBuildProcessingState).mockResolvedValue('INVALID');

    await resumeAppStoreReleases();
    await finished(build.id);

    expect((await release(build.id)).error).toBe('Apple marked the build INVALID — App Store Connect → TestFlight has the reason.');
    expect(uploads.readBuildUpload).not.toHaveBeenCalled();
  });

  it('puts the step’s own words back on the stage when a deferred step is still waiting', async () => {
    const build = await seeded(
      entry({ step: 'PROCESSING', stage: `${STAGE.PROCESSING} — retrying shortly (busy)`, build_upload_id: 'upload-1' })
    );
    m(uploads.readBuildUpload).mockResolvedValue({ state: 'PROCESSING', errors: [], buildId: '' });

    await resumeAppStoreReleases();
    await until(async () => (await release(build.id)).stage === STAGE.PROCESSING);
    await settle();

    expect((await release(build.id)).status).toBe('PUSHING');
  });

  it('applies the listing and submits an App Review push, leaving out What’s New on a first version', async () => {
    const build = await seeded(entry({ track: 'APP_STORE', step: 'PROCESSING', stage: STAGE.PROCESSING, asc_app_id: 'app-1', asc_build_id: 'asc-build-1' }));
    const listing = completeListing();
    m(uploads.readBuildProcessingState).mockResolvedValue('VALID');
    m(getStoreListing).mockResolvedValue(listing);
    m(listings.editableAppInfo).mockResolvedValue('info-1');
    m(listings.ensureAppStoreVersion).mockResolvedValue({ id: 'version-1', first: true });
    m(listings.upsertVersionLocalization).mockResolvedValue('loc-1');
    m(fetchStoreAssets).mockImplementation(async (urls: string[]) => urls.map((url) => ({ url })));
    m(openReviewSubmission).mockResolvedValue('submission-1');

    await resumeAppStoreReleases();
    await finished(build.id);

    const row = await release(build.id);
    expect(row).toEqual(
      expect.objectContaining({ status: 'RELEASED', step: 'DONE', version_id: 'version-1', submission_id: 'submission-1' })
    );
    const appleListing = m(listings.upsertAppInfoLocalization).mock.calls[0][2];
    expect(appleListing).toEqual(
      expect.objectContaining({
        locale: 'en-US',
        name: 'Duncit',
        privacyPolicyUrl: 'https://example.com/privacy',
        primaryCategory: 'SOCIAL_NETWORKING',
        whatsNew: 'Bug fixes',
        review: expect.objectContaining({ contactFirstName: 'Rev', contactEmail: 'review@example.com', demoAccountRequired: false, notes: 'none' }),
      })
    );
    expect(listings.setPrimaryCategory).toHaveBeenCalledWith('asc-token', 'info-1', 'SOCIAL_NETWORKING');
    expect(listings.ensureAppStoreVersion).toHaveBeenCalledWith('asc-token', 'app-1', '1.5.0', '2026 Duncit');
    expect(m(listings.upsertVersionLocalization).mock.calls[0]).toEqual(['asc-token', 'version-1', { ...appleListing, whatsNew: '' }]);
    expect(syncScreenshotSet).toHaveBeenCalledWith('asc-token', 'loc-1', 'APP_IPHONE_67', [{ url: 'https://cdn/iphone-1.png' }]);
    expect(syncScreenshotSet).toHaveBeenCalledWith('asc-token', 'loc-1', 'APP_IPAD_PRO_3GEN_129', [{ url: 'https://cdn/ipad-1.png' }]);
    expect(listings.upsertReviewDetail).toHaveBeenCalledWith('asc-token', 'version-1', appleListing.review);
    expect(listings.attachBuild).toHaveBeenCalledWith('asc-token', 'version-1', 'asc-build-1');
    expect(openReviewSubmission).toHaveBeenCalledWith('asc-token', 'app-1');
    expect(addVersionToSubmission).toHaveBeenCalledWith('asc-token', 'submission-1', 'version-1');
    expect(submitForReview).toHaveBeenCalledWith('asc-token', 'submission-1');
    await until(() => announce.mock.calls.length > 0);
    expect(announce.mock.calls[0][1]).toBe(`:rocket: iOS v1.5.0 build 42 (IOS-1) was submitted to App Review — pushed by ${BY}`);
  });

  it('keeps What’s New on a later version and the listing locale as saved', async () => {
    const build = await seeded(entry({ track: 'APP_STORE', step: 'LISTING', stage: STAGE.LISTING, asc_app_id: 'app-1', asc_build_id: 'asc-build-1' }));
    m(getStoreListing).mockResolvedValue(completeListing({ locale: 'en-GB' }));
    m(listings.editableAppInfo).mockResolvedValue('info-1');
    m(listings.ensureAppStoreVersion).mockResolvedValue({ id: 'version-2', first: false });
    m(listings.upsertVersionLocalization).mockResolvedValue('loc-2');
    m(fetchStoreAssets).mockResolvedValue([]);
    m(openReviewSubmission).mockResolvedValue('submission-2');

    await resumeAppStoreReleases();
    await finished(build.id);

    const copy = m(listings.upsertVersionLocalization).mock.calls[0][2];
    expect(copy).toEqual(expect.objectContaining({ locale: 'en-GB', whatsNew: 'Bug fixes' }));
    expect((await release(build.id)).status).toBe('RELEASED');
  });

  it('reuses a review submission it already opened', async () => {
    const build = await seeded(
      entry({ track: 'APP_STORE', step: 'SUBMIT', stage: STAGE.SUBMIT, asc_app_id: 'app-1', version_id: 'version-1', submission_id: 'submission-0' })
    );

    await resumeAppStoreReleases();
    await finished(build.id);

    expect(openReviewSubmission).not.toHaveBeenCalled();
    expect(addVersionToSubmission).toHaveBeenCalledWith('asc-token', 'submission-0', 'version-1');
    expect((await release(build.id)).status).toBe('RELEASED');
  });

  it('finishes an entry that is PUSHING on the DONE step', async () => {
    const build = await seeded(entry({ step: 'DONE', stage: '' }));
    await resumeAppStoreReleases();
    await finished(build.id);
    expect((await release(build.id)).status).toBe('RELEASED');
  });
});

describe('resumeAppStoreReleases — failures and scheduling', () => {
  it('keeps a push alive with a note on its stage when Apple is busy', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1' }));
    m(uploads.findBuild).mockRejectedValue(new AscError(503, 'busy'));

    await resumeAppStoreReleases();
    await until(() => warn.mock.calls.some(([, event]) => event === 'appStoreDeferred'));

    const row = await release(build.id);
    expect(row.status).toBe('PUSHING');
    expect(row.stage).toBe(`${STAGE.UPLOAD} — retrying shortly (App Store Connect refused the request (HTTP 503): busy)`);
    expect(row.heartbeat_at.getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(warn).toHaveBeenCalledWith('appBuild', 'appStoreDeferred', expect.objectContaining({ step: 'UPLOAD', track: 'TESTFLIGHT' }));
    expect(announce).not.toHaveBeenCalled();
  });

  it('ends the push on a refusal Apple would repeat, including a non-Error throw', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1' }));
    m(uploads.findBuild).mockRejectedValue('forbidden by policy');

    await resumeAppStoreReleases();
    await finished(build.id);

    expect(await release(build.id)).toEqual(expect.objectContaining({ status: 'FAILED', error: 'forbidden by policy' }));
  });

  it('gives up on a push Apple has not finished in three hours, without calling Apple', async () => {
    const build = await seeded(entry({ started_at: new Date(Date.now() - 4 * HOUR) }));

    await resumeAppStoreReleases();
    await finished(build.id);

    expect((await release(build.id)).error).toBe('Apple did not finish within three hours; press again to retry.');
    expect(requireAscConfig).not.toHaveBeenCalled();
  });

  it('only picks up PUSHING entries whose heartbeat is stale', async () => {
    const old = new Date(Date.now() - 4 * HOUR);
    const build = await seeded(
      entry({ status: 'FAILED', heartbeat_at: old, started_at: old }),
      entry({ heartbeat_at: new Date(), started_at: old }),
      entry({ heartbeat_at: old, started_at: old })
    );
    // A build whose only push is fresh is not touched at all.
    const fresh = await makeBuild({ build_no: 'IOS-2', app_store_releases: [entry({ heartbeat_at: new Date(), started_at: old })] });

    await resumeAppStoreReleases();
    await finished(build.id, 2);
    await settle();

    expect((await release(build.id, 0)).status).toBe('FAILED');
    expect((await release(build.id, 0)).error).toBe('');
    expect((await release(build.id, 1)).status).toBe('PUSHING');
    expect((await release(build.id, 2)).status).toBe('FAILED');
    expect((await release(fresh.id, 0)).status).toBe('PUSHING');
  });

  it('never drives the same entry twice at once', async () => {
    const build = await seeded(entry({ asc_app_id: 'app-1' }));
    let unblock: (value: null) => void = () => undefined;
    m(uploads.findBuild).mockReturnValueOnce(new Promise((resolve) => (unblock = resolve)));
    m(uploads.readBuildUpload).mockResolvedValue({ state: 'PROCESSING', errors: [], buildId: '' });
    m(uploads.createBuildUpload).mockResolvedValue('upload-1');
    m(uploads.reserveBuildUploadFile).mockResolvedValue({ id: 'file-1', operations: [] });

    await Promise.all([resumeAppStoreReleases(), resumeAppStoreReleases()]);
    await until(() => m(uploads.findBuild).mock.calls.length > 0);
    await settle();
    expect(uploads.findBuild).toHaveBeenCalledTimes(1);

    unblock(null);
    await until(() => m(uploads.readBuildUpload).mock.calls.length > 0);
    await settle();
    expect(uploads.createBuildUpload).toHaveBeenCalledTimes(1);
  });
});
