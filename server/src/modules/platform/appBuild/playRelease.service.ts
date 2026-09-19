import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { clip } from '@utils/slack-blocks';
import { AppBuildModel, type IAppBuild, type PlayStoreTrack } from './appBuild.model';
import {
  parseServiceAccount,
  releaseBundle,
  type PlayConfig,
  type PlayTrack,
  type ReleaseExtras,
} from './googlePlay.gateway';
import { applyPlayListing, playListingOf, type PlayListing } from './googlePlayListing';
import { getStoreListing, requirePlayListing } from './storeListing.service';
import { announceRelease, badInput, releasableBuild, storedArtifactPath } from './releaseGuards';

/**
 * Pushing a build's stored AAB to Google Play from the Tech portal.
 *
 * The build row is the record: every press appends a release entry, the
 * mutation answers the moment that entry says PUSHING, and the upload and
 * commit run behind it. A GraphQL request that waited for Google would sit
 * behind the proxy's timeout on exactly the pushes that matter — a 50 MB
 * upload plus a production commit — and a request that times out AFTER Google
 * applied the release would look like a failure that a retry then turns into
 * "version code already used".
 */

const STORE = 'Google Play';

/**
 * A PUSHING entry older than this belongs to a server that died mid-push —
 * nothing is coming back to finish it, so the button is offered again.
 */
const PUSH_STALE_MS = 15 * 60_000;

const API_TRACK: Record<PlayStoreTrack, PlayTrack> = { INTERNAL: 'internal', PRODUCTION: 'production' };
const TRACK_LABEL: Record<PlayStoreTrack, string> = {
  INTERNAL: 'internal testing',
  PRODUCTION: 'production',
};

const notConfigured = () =>
  badInput(
    'Google Play is not connected. Add a service account key and package name in Environment Variables → Google Play.'
  );

/** What the settings page shows — present or not, and which app. Never the key. */
export async function playStoreSettings(): Promise<{ configured: boolean; packageName: string }> {
  const [json, packageName] = await Promise.all([
    getRuntimeEnvValue('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'),
    getRuntimeEnvValue('GOOGLE_PLAY_PACKAGE_NAME'),
  ]);
  const configured = Boolean(json.trim() && packageName.trim());
  return { configured, packageName: configured ? packageName.trim() : '' };
}

async function requirePlayConfig(): Promise<PlayConfig> {
  const [json, packageName] = await Promise.all([
    getRuntimeEnvValue('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'),
    getRuntimeEnvValue('GOOGLE_PLAY_PACKAGE_NAME'),
  ]);
  if (!json.trim() || !packageName.trim()) throw notConfigured();
  try {
    return { account: parseServiceAccount(json), packageName: packageName.trim() };
  } catch (err) {
    throw badInput(err instanceof Error ? err.message : String(err));
  }
}

const isInFlight = (r: IAppBuild['play_releases'][number]): boolean =>
  r.status === 'PUSHING' && Date.now() - r.started_at.getTime() < PUSH_STALE_MS;

/**
 * A production release carries the Store Listing with it, inside the same edit
 * — copy, images and the release notes on the track. Internal testing is only
 * for testers, and the listing is store-wide, so it is left alone there.
 */
function releaseExtras(cfg: PlayConfig, listing: PlayListing | null): ReleaseExtras {
  if (!listing) return {};
  return {
    applyListing: (token, editId) => applyPlayListing(token, cfg.packageName, editId, listing),
    releaseNotes: listing.releaseNotes ? [{ language: listing.language, text: listing.releaseNotes }] : [],
  };
}

/**
 * The background half: talk to Google, then write the outcome onto the entry
 * the mutation opened. Positional `$set`, not `save()`, so a report landing
 * on the same row meanwhile cannot overwrite this and this cannot overwrite it.
 */
async function runRelease(
  build: IAppBuild,
  index: number,
  cfg: PlayConfig,
  aabPath: string,
  track: PlayStoreTrack,
  by: string,
  listing: PlayListing | null
): Promise<void> {
  const releaseName = `v${build.version} (${build.commit_sha.slice(0, 7)})`;
  let versionCode = '';
  let error = '';
  try {
    versionCode = String(
      await releaseBundle(cfg, aabPath, API_TRACK[track], releaseName, releaseExtras(cfg, listing))
    );
  } catch (err) {
    error = clip(err instanceof Error ? err.message : String(err), 500);
  }
  await AppBuildModel.updateOne(
    { _id: build._id },
    {
      $set: {
        [`play_releases.${index}.status`]: error ? 'FAILED' : 'RELEASED',
        [`play_releases.${index}.version_code`]: versionCode,
        [`play_releases.${index}.error`]: error,
        [`play_releases.${index}.finished_at`]: new Date(),
      },
    }
  );
  logs.server.warn('appBuild', 'playRelease', {
    build_no: build.build_no,
    track,
    by,
    version_code: versionCode,
    error,
  });
  const where = `${STORE} ${TRACK_LABEL[track]}`;
  const text = error
    ? `:x: Android v${build.version} (${build.build_no}) could not be pushed to ${where} — ${clip(error, 300)}`
    : `:rocket: Android v${build.version} (${build.build_no}) is on ${where} as version code ${versionCode} — pushed by ${by}`;
  await announceRelease('SLACK_ANDROID_BUILDS_CHANNEL', text, build.build_no);
}

/**
 * Record the push and start it. Resolves with the row already showing PUSHING;
 * the outcome arrives on the row, not on this promise.
 */
export async function pushBuildToPlayStore(id: string, track: PlayStoreTrack, by: string): Promise<IAppBuild> {
  const build = await releasableBuild(id, 'ANDROID', STORE);
  if ((build.play_releases ?? []).some(isInFlight)) {
    throw badInput(`A push to ${STORE} is already in progress for ${build.build_no}.`);
  }
  const aabPath = await storedArtifactPath(build, 'AAB', STORE);
  const cfg = await requirePlayConfig();
  // What Store Listing still lacks is refused here, at the click, not in the background.
  const listing = track === 'PRODUCTION' ? playListingOf(requirePlayListing(await getStoreListing())) : null;
  build.play_releases.push({
    track,
    status: 'PUSHING',
    version_code: '',
    error: '',
    by,
    started_at: new Date(),
    finished_at: null,
  });
  await build.save();
  const index = build.play_releases.length - 1;
  runRelease(build, index, cfg, aabPath, track, by, listing).catch((err) =>
    logs.server.error('appBuild', 'playRelease', { error: err, build_no: build.build_no })
  );
  return build;
}
