import {
  AppBuildModel,
  type AppBuildEnv,
  type AppBuildPlatform,
  type AppBuildStatus,
  type AppBuildTrigger,
  type IAppBuildPlayRelease,
} from '@modules/platform/appBuild/appBuild.model';
import { BrandingModel } from '@modules/platform/settings/settings.model';
import { TelemetryLogModel } from '@modules/platform/telemetry/telemetry.model';
import { dayKeyExpr, inEitherPeriod, inRange, type AnalyticsWindow } from './window';
import { average, pct, type AnalyticsLeaderboard } from './shapes';

/**
 * What the App releases analytics page reads: the build rows Tech > App Builds
 * records for every Android and iOS build, the Google Play pushes made from
 * them, the version Admin > Branding says is current, and the native app's
 * error logs by the app version that wrote them.
 *
 * Neither the active-user pings nor the app events carry an app version or a
 * platform, so "who is on an old version" is answered from error logs — the
 * only record that names the version a device runs.
 */

export const PLATFORMS: AppBuildPlatform[] = ['ANDROID', 'IOS'];

export interface BuildRow {
  platform: AppBuildPlatform;
  status: AppBuildStatus;
  version: string;
  duration_seconds: number | null;
  trigger_source: AppBuildTrigger;
  app_env: AppBuildEnv;
  // Absent on rows written before builds could be pushed to Google Play.
  play_releases?: Array<Pick<IAppBuildPlayRelease, 'status'>>;
  created_at: Date;
}

/** Builds started in a period. Naming both platforms lets the platform + created_at index serve the range. */
export const loadBuilds = (from: Date, to: Date) =>
  AppBuildModel.find({ platform: { $in: PLATFORMS }, created_at: inRange(from, to) })
    .select('platform status version duration_seconds trigger_source app_env play_releases.status created_at')
    .sort({ created_at: 1 })
    .lean<BuildRow[]>();

const FINISHED = new Set<AppBuildStatus>(['SUCCESS', 'FAILED']);

/** Queued and running builds are one slice: neither has an outcome yet. */
export const statusKey = (row: BuildRow) => (FINISHED.has(row.status) ? row.status : 'IN_PROGRESS');

/** Successful builds' times in milliseconds — a failed build stopped early, so its time says nothing. */
export const buildTimes = (rows: readonly BuildRow[]) =>
  rows.flatMap((row) => (row.status === 'SUCCESS' && row.duration_seconds ? [row.duration_seconds * 1000] : []));

export const onPlatform = (rows: readonly BuildRow[], platform: AppBuildPlatform) =>
  rows.filter((row) => row.platform === platform);

/** Each build tile's value for one period — computed identically for both periods. */
export function buildFigures(rows: readonly BuildRow[]) {
  const finished = rows.filter((row) => FINISHED.has(row.status));
  const failed = rows.filter((row) => row.status === 'FAILED').length;
  return {
    builds: rows.length,
    android: onPlatform(rows, 'ANDROID').length,
    ios: onPlatform(rows, 'IOS').length,
    failed,
    success_rate: pct(finished.length - failed, finished.length),
    avg_time: Math.round(average(buildTimes(rows))),
    versions: new Set(rows.map((row) => row.version).filter(Boolean)).size,
  };
}

export interface ReleaseDay {
  _id: { day: string; track: string; period: string };
  count: number;
}

/**
 * Google Play pushes that went through, by the day they finished. Only Play
 * pushes are recorded on a build, so App Store deliveries are not counted.
 */
export function releaseDays(window: AnalyticsWindow) {
  const finished = inEitherPeriod('play_releases.finished_at', window);
  return AppBuildModel.aggregate<ReleaseDay>([
    { $match: finished },
    { $unwind: '$play_releases' },
    { $match: { ...finished, 'play_releases.status': 'RELEASED' } },
    {
      $group: {
        _id: {
          day: dayKeyExpr('play_releases.finished_at', window.zone),
          track: '$play_releases.track',
          period: { $cond: [{ $gte: ['$play_releases.finished_at', window.from] }, 'now', 'before'] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
}

/**
 * How far the version Admin > Branding calls latest has got: successful builds
 * of it, and how many of those reached Google Play. The version moves on every
 * deploy (synced from app.json) while a store build ships separately, so these
 * say whether what is deployed has reached the store yet. Null when no version
 * is set.
 */
export async function latestVersion() {
  const branding = await BrandingModel.findOne({ singleton_key: 'branding' }).select('app_latest_version').lean();
  const version = branding?.app_latest_version?.trim() ?? '';
  if (!version) return null;
  const [builds, released] = await Promise.all([
    AppBuildModel.countDocuments({ version, status: 'SUCCESS' }),
    AppBuildModel.countDocuments({ version, play_releases: { $elemMatch: { status: 'RELEASED' } } }),
  ]);
  return { builds, released };
}

/** Native builds report themselves as `mobileApp` or `mobileApp:<os>`. */
const NATIVE_SOURCE = /^mobileApp/;

export interface VersionErrors {
  _id: { version: string; period: string };
  count: number;
}

/** The native app's error logs per app version and period. */
export const nativeErrors = (window: AnalyticsWindow) =>
  TelemetryLogModel.aggregate<VersionErrors>([
    { $match: { level: 'error', source: NATIVE_SOURCE, ...inEitherPeriod('created_at', window) } },
    {
      $group: {
        _id: {
          // A log that named no version is filed under 'none', which the console reads as not set.
          version: { $cond: [{ $gt: [{ $ifNull: ['$client.app_version', ''] }, ''] }, '$client.app_version', 'none'] },
          period: { $cond: [{ $gte: ['$created_at', window.from] }, 'now', 'before'] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

/** The window's native error logs per version; `none` for logs that named no version. */
export function errorsByVersion(rows: readonly VersionErrors[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows.filter((entry) => entry._id.period === 'now')) {
    counts.set(row._id.version, (counts.get(row._id.version) ?? 0) + row.count);
  }
  return counts;
}

/** The ten newest versions built in the window, one row each across both platforms. */
export function versionLeaderboard(rows: readonly BuildRow[], errors: ReadonlyMap<string, number>): AnalyticsLeaderboard {
  const versions = [...new Set(rows.map((row) => row.version).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
    .slice(0, 10);
  return {
    key: 'app_versions',
    columns: [
      { key: 'app_version_android', format: 'COUNT' },
      { key: 'app_version_ios', format: 'COUNT' },
      { key: 'app_version_failed', format: 'COUNT' },
      { key: 'app_version_build_time', format: 'DURATION' },
      { key: 'app_version_released', format: 'COUNT' },
      { key: 'app_version_errors', format: 'COUNT' },
    ],
    rows: versions.map((version) => {
      const own = rows.filter((row) => row.version === version);
      const released = own.filter((row) => row.play_releases?.some((push) => push.status === 'RELEASED'));
      return {
        id: version,
        name: version,
        caption: null,
        values: [
          onPlatform(own, 'ANDROID').length,
          onPlatform(own, 'IOS').length,
          own.filter((row) => row.status === 'FAILED').length,
          Math.round(average(buildTimes(own))),
          released.length,
          errors.get(version) ?? 0,
        ],
      };
    }),
  };
}
