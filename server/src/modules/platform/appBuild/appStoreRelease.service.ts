import fs from 'node:fs';
import path from 'node:path';
import { logs } from '@observability/log';
import { clip } from '@utils/slack-blocks';
import {
  AppBuildModel,
  type AppStoreReleaseStep,
  type AppStoreTrack,
  type IAppBuild,
  type IAppBuildAppStoreRelease,
} from './appBuild.model';
import { ascToken, findApp } from './appStoreConnect.gateway';
import { requireAscConfig } from './iosSigning.service';
import * as uploads from './ascBuildUpload.gateway';
import * as listings from './ascListing.gateway';
import { syncScreenshotSet } from './ascScreenshots.gateway';
import { addVersionToSubmission, openReviewSubmission, submitForReview } from './ascReview.gateway';
import { getStoreListing, requireAppleListing } from './storeListing.service';
import type { IStoreListing } from './storeListing.model';
import { fetchStoreAssets } from './storeAssets';
import { announceRelease, badInput, releasableBuild, storedArtifactPath } from './releaseGuards';

/**
 * Pushing a build's stored IPA to App Store Connect from the Tech portal — the
 * whole way, with no Mac: upload over the API, wait for Apple to process it,
 * and for the APP_STORE track apply the Store Listing and submit for review.
 *
 * A state machine on the build row rather than one long promise, because the
 * middle of it belongs to Apple: processing takes ten to thirty minutes and
 * the server may be redeployed meanwhile. Each step records what it learned
 * (the app id, the upload id, the build id, the version id) with a positional
 * `$set`, and `drive` runs steps until one has to wait. The scheduler hands
 * any PUSHING entry nobody has touched lately back to `drive`, which carries
 * on from the recorded step — a retry after a failure finds the build Apple
 * already holds instead of uploading it twice.
 */

const STORE = 'App Store Connect';

/** Untouched this long → the process driving it is gone; the scheduler takes over. */
const STALE_MS = 2 * 60_000;
/** Apple never finished → give up, so the button comes back. */
const GIVE_UP_MS = 3 * 60 * 60_000;

const STAGE: Record<AppStoreReleaseStep, string> = {
  UPLOAD: 'Uploading the IPA to App Store Connect',
  PROCESSING: 'Waiting for Apple to process the build',
  LISTING: 'Applying the store listing',
  SUBMIT: 'Submitting for App Review',
  DONE: '',
};

const TRACK_LABEL: Record<AppStoreTrack, string> = { TESTFLIGHT: 'TestFlight', APP_STORE: 'App Review' };

type Next = AppStoreReleaseStep | 'WAIT';

const isPushing = (r: IAppBuildAppStoreRelease): boolean => r.status === 'PUSHING';

/** Entries this process is driving right now, so a scheduler tick never doubles up on one. */
const active = new Set<string>();

/** Positional write onto one entry, stamping the heartbeat with it. */
async function patch(buildId: string, index: number, fields: Record<string, unknown>): Promise<void> {
  const $set: Record<string, unknown> = { [`app_store_releases.${index}.heartbeat_at`]: new Date() };
  for (const [key, value] of Object.entries(fields)) $set[`app_store_releases.${index}.${key}`] = value;
  await AppBuildModel.updateOne({ _id: buildId }, { $set });
}

/** The Store Listing in the shape the App Store Connect gateways take. */
function appleListingOf(doc: IStoreListing): listings.AppleListing {
  return {
    locale: doc.locale || 'en-US',
    name: doc.name,
    subtitle: doc.subtitle,
    privacyPolicyUrl: doc.privacy_policy_url,
    primaryCategory: doc.primary_category,
    copyright: doc.copyright,
    description: doc.description,
    keywords: doc.keywords,
    whatsNew: doc.whats_new,
    supportUrl: doc.support_url,
    marketingUrl: doc.marketing_url,
    review: {
      contactFirstName: doc.review_first_name,
      contactLastName: doc.review_last_name,
      contactEmail: doc.contact_email,
      contactPhone: doc.contact_phone,
      demoAccountName: doc.demo_account_name,
      demoAccountPassword: doc.demo_account_password,
      demoAccountRequired: doc.demo_account_required,
      notes: doc.review_notes,
    },
  };
}

function outcomeText(build: IAppBuild, entry: IAppBuildAppStoreRelease, error: string): string {
  const who = `iOS v${build.version} build ${build.build_number} (${build.build_no})`;
  if (error) return `:x: ${who} could not be pushed to ${TRACK_LABEL[entry.track]} — ${clip(error, 300)}`;
  if (entry.track === 'TESTFLIGHT') return `:rocket: ${who} is processed and on TestFlight — pushed by ${entry.by}`;
  return `:rocket: ${who} was submitted to App Review — pushed by ${entry.by}`;
}

async function finish(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease, error: string): Promise<void> {
  await patch(build.id, index, {
    status: error ? 'FAILED' : 'RELEASED',
    ...(error ? {} : { step: 'DONE' }),
    stage: '',
    error,
    finished_at: new Date(),
  });
  logs.server.warn('appBuild', 'appStoreRelease', {
    build_no: build.build_no,
    track: entry.track,
    by: entry.by,
    asc_build_id: entry.asc_build_id,
    error,
  });
  await announceRelease('SLACK_IOS_BUILDS_CHANNEL', outcomeText(build, entry, error), build.build_no);
}

// --- the steps ---------------------------------------------------------------

async function stepUpload(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease, token: string, bundleId: string): Promise<Next> {
  const app = entry.asc_app_id ? { id: entry.asc_app_id } : await findApp(token, bundleId);
  if (!app) throw new Error(`No App Store Connect app uses ${bundleId} yet — create it under Apps → New App first.`);
  await patch(build.id, index, { asc_app_id: app.id });
  // Idempotent: a retry after a failure further down finds the build Apple already has.
  const known = await uploads.findBuild(token, app.id, build.version, build.build_number);
  if (known) {
    await patch(build.id, index, { asc_build_id: known.id });
    return 'PROCESSING';
  }
  if (entry.build_upload_id) {
    const previous = await uploads.readBuildUpload(token, entry.build_upload_id);
    if (previous.state === 'PROCESSING' || previous.state === 'COMPLETE') return 'PROCESSING';
    // Died mid-upload: which parts landed is unknowable, so start the upload over.
    await uploads.deleteBuildUpload(token, entry.build_upload_id).catch((err) =>
      logs.server.warn('appBuild', 'appStoreUploadDiscard', { error: err, build_no: build.build_no })
    );
  }
  const ipaPath = await storedArtifactPath(build, 'IPA', STORE);
  const { size } = await fs.promises.stat(ipaPath);
  const uploadId = await uploads.createBuildUpload(token, app.id, build.version, build.build_number);
  await patch(build.id, index, { build_upload_id: uploadId });
  const file = await uploads.reserveBuildUploadFile(token, uploadId, path.basename(ipaPath), size);
  await uploads.putFileParts(ipaPath, file.operations, () => patch(build.id, index, {}));
  await uploads.commitBuildUploadFile(token, file.id);
  return 'PROCESSING';
}

async function stepProcessing(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease, token: string): Promise<Next> {
  let buildId = entry.asc_build_id;
  if (!buildId) {
    const state = await uploads.readBuildUpload(token, entry.build_upload_id);
    if (state.state === 'FAILED') {
      throw new Error(`Apple rejected the upload: ${state.errors.join('; ') || 'no reason given'}`);
    }
    if (!state.buildId) return 'WAIT';
    buildId = state.buildId;
    await patch(build.id, index, { asc_build_id: buildId });
  }
  const processing = await uploads.readBuildProcessingState(token, buildId);
  if (processing === 'PROCESSING') return 'WAIT';
  if (processing !== 'VALID') {
    throw new Error(`Apple marked the build ${processing} — App Store Connect → TestFlight has the reason.`);
  }
  return entry.track === 'TESTFLIGHT' ? 'DONE' : 'LISTING';
}

async function stepListing(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease, token: string): Promise<Next> {
  const doc = requireAppleListing(await getStoreListing());
  const listing = appleListingOf(doc);
  const appInfoId = await listings.editableAppInfo(token, entry.asc_app_id);
  await listings.upsertAppInfoLocalization(token, appInfoId, listing);
  await listings.setPrimaryCategory(token, appInfoId, listing.primaryCategory);
  const versionId = await listings.ensureAppStoreVersion(token, entry.asc_app_id, build.version, listing.copyright);
  await patch(build.id, index, { version_id: versionId });
  const localizationId = await listings.upsertVersionLocalization(token, versionId, listing);
  await syncScreenshotSet(token, localizationId, 'APP_IPHONE_67', await fetchStoreAssets(doc.iphone_screenshots));
  await syncScreenshotSet(token, localizationId, 'APP_IPAD_PRO_3GEN_129', await fetchStoreAssets(doc.ipad_screenshots));
  await listings.upsertReviewDetail(token, versionId, listing.review);
  await listings.attachBuild(token, versionId, entry.asc_build_id);
  return 'SUBMIT';
}

async function stepSubmit(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease, token: string): Promise<Next> {
  const submissionId = entry.submission_id || (await openReviewSubmission(token, entry.asc_app_id));
  await patch(build.id, index, { submission_id: submissionId });
  await addVersionToSubmission(token, submissionId, entry.version_id);
  await submitForReview(token, submissionId);
  return 'DONE';
}

async function runStep(build: IAppBuild, index: number, entry: IAppBuildAppStoreRelease): Promise<Next> {
  const { creds, bundleId } = await requireAscConfig();
  const token = ascToken(creds);
  switch (entry.step) {
    case 'UPLOAD':
      return stepUpload(build, index, entry, token, bundleId);
    case 'PROCESSING':
      return stepProcessing(build, index, entry, token);
    case 'LISTING':
      return stepListing(build, index, entry, token);
    case 'SUBMIT':
      return stepSubmit(build, index, entry, token);
    default:
      return 'DONE';
  }
}

/** Run steps until one has to wait for Apple, or the push is over either way. */
async function drive(buildId: string, index: number): Promise<void> {
  const key = `${buildId}:${index}`;
  if (active.has(key)) return;
  active.add(key);
  try {
    for (;;) {
      const build = await AppBuildModel.findById(buildId);
      const entry = build?.app_store_releases[index];
      if (!build || !entry || !isPushing(entry)) return;
      if (Date.now() - entry.started_at.getTime() > GIVE_UP_MS) {
        await finish(build, index, entry, 'Apple did not finish within three hours; press again to retry.');
        return;
      }
      let next: Next;
      try {
        next = await runStep(build, index, entry);
      } catch (err) {
        await finish(build, index, entry, clip(err instanceof Error ? err.message : String(err), 500));
        return;
      }
      if (next === 'WAIT') return;
      if (next === 'DONE') {
        await finish(build, index, entry, '');
        return;
      }
      await patch(buildId, index, { step: next, stage: STAGE[next] });
    }
  } finally {
    active.delete(key);
  }
}

/**
 * Record the push and start it. Resolves with the row already showing PUSHING;
 * the outcome arrives on the row. What Store Listing still lacks is refused
 * HERE, at the click, not twenty minutes later after Apple processed the build.
 */
export async function pushBuildToAppStore(id: string, track: AppStoreTrack, by: string): Promise<IAppBuild> {
  const build = await releasableBuild(id, 'IOS', STORE);
  if (!build.build_number) {
    throw badInput(
      'This build was reported before the runner sent its build number, which App Store Connect needs up front. Make a new build.'
    );
  }
  if ((build.app_store_releases ?? []).some(isPushing)) {
    throw badInput(`A push to ${STORE} is already in progress for ${build.build_no}.`);
  }
  await storedArtifactPath(build, 'IPA', STORE);
  await requireAscConfig();
  if (track === 'APP_STORE') requireAppleListing(await getStoreListing());
  const now = new Date();
  build.app_store_releases.push({
    track,
    status: 'PUSHING',
    step: 'UPLOAD',
    stage: STAGE.UPLOAD,
    asc_app_id: '',
    build_upload_id: '',
    asc_build_id: '',
    version_id: '',
    submission_id: '',
    error: '',
    by,
    started_at: now,
    heartbeat_at: now,
    finished_at: null,
  });
  await build.save();
  const index = build.app_store_releases.length - 1;
  drive(build.id, index).catch((err) =>
    logs.server.error('appBuild', 'appStoreRelease', { error: err, build_no: build.build_no })
  );
  return build;
}

/** The scheduler's tick: carry on every PUSHING entry nobody has touched lately. */
export async function resumeAppStoreReleases(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_MS);
  const builds = await AppBuildModel.find(
    { app_store_releases: { $elemMatch: { status: 'PUSHING', heartbeat_at: { $lt: cutoff } } } },
    { app_store_releases: 1, build_no: 1 }
  );
  for (const build of builds) {
    build.app_store_releases.forEach((entry, index) => {
      if (!isPushing(entry) || entry.heartbeat_at >= cutoff) return;
      drive(build.id, index).catch((err) =>
        logs.server.error('appBuild', 'appStoreResume', { error: err, build_no: build.build_no })
      );
    });
  }
}
