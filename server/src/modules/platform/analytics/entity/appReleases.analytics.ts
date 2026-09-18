import { consoleLink } from './links';
import { bucketSeries, seriesFromDays, type AnalyticsWindow } from './window';
import {
  average,
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  tally,
  topSlices,
  total,
  trend,
  type AnalyticsKpi,
  type EntityAnalyticsSections,
} from './shapes';
import {
  PLATFORMS,
  buildFigures,
  buildTimes,
  errorsByVersion,
  latestVersion,
  loadBuilds,
  nativeErrors,
  onPlatform,
  releaseDays,
  statusKey,
  versionLeaderboard,
  type BuildRow,
  type ReleaseDay,
} from './appReleases.data';

/**
 * Analytics > Tech > App releases — the native app's builds and releases over
 * the period: builds per platform and how they ended, how long they took, what
 * reached Google Play, whether the latest version (Admin > Branding) has a
 * build in the store, and which app versions are writing errors. Builds are
 * counted by when they started, releases by when Google accepted them.
 */

const ANDROID = consoleLink('tech', '/app-builds/android');
const IOS = consoleLink('tech', '/app-builds/ios');
const ERROR_LOGS = consoleLink('tech', '/telemetry/error-logs');

const BUILD_STATUSES = ['SUCCESS', 'FAILED', 'IN_PROGRESS'] as const;
const TRIGGERS = ['PUSH', 'PORTAL'] as const;
const ENVIRONMENTS = ['PRODUCTION', 'STAGING'] as const;
const TRACKS = ['INTERNAL', 'PRODUCTION'] as const;

interface ReleaseFigures {
  build: ReturnType<typeof buildFigures>;
  releases: number;
  production: number;
  errors: number;
}

const inPeriod = (period: string) => (row: { _id: { period: string } }) => row._id.period === period;

function figuresFor(builds: readonly BuildRow[], releases: readonly ReleaseDay[], errors: number): ReleaseFigures {
  return {
    build: buildFigures(builds),
    releases: total(releases.map((row) => row.count)),
    production: total(releases.filter((row) => row._id.track === 'PRODUCTION').map((row) => row.count)),
    errors,
  };
}

/** The window's Google Play releases per track — a release day can carry both tracks. */
function trackSlices(releases: readonly ReleaseDay[]) {
  const counts = new Map<string, number>();
  for (const row of releases) counts.set(row._id.track, (counts.get(row._id.track) ?? 0) + row.count);
  return fixedSlices(TRACKS, counts);
}

type Latest = Awaited<ReturnType<typeof latestVersion>>;

function releaseKpis(now: ReleaseFigures, before: ReleaseFigures, latest: Latest): AnalyticsKpi[] {
  const kpis = [
    kpi('app_builds', now.build.builds, before.build.builds, { link: ANDROID }),
    kpi('app_android_builds', now.build.android, before.build.android, { link: ANDROID }),
    kpi('app_ios_builds', now.build.ios, before.build.ios, { link: IOS }),
    kpi('app_build_success_rate', now.build.success_rate, before.build.success_rate, { format: 'PERCENT', link: ANDROID }),
    kpi('app_failed_builds', now.build.failed, before.build.failed, { higherIsBetter: false, link: ANDROID }),
    kpi('app_avg_build_time', now.build.avg_time, before.build.avg_time, {
      format: 'DURATION',
      higherIsBetter: false,
      link: ANDROID,
    }),
    kpi('app_versions_built', now.build.versions, before.build.versions, { link: ANDROID }),
    kpi('app_store_releases', now.releases, before.releases, { link: ANDROID }),
    kpi('app_production_releases', now.production, before.production, { link: ANDROID }),
    kpi('app_native_errors', now.errors, before.errors, { higherIsBetter: false, link: ERROR_LOGS }),
  ];
  // With no latest version set there is nothing to measure, and a zero would read as an alarm.
  if (latest) {
    kpis.push(
      kpi('app_latest_version_builds', latest.builds, null, { link: ANDROID }),
      kpi('app_latest_version_released', latest.released, null, { link: ANDROID })
    );
  }
  return kpis;
}

export async function appReleaseAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, releases, latest, errorRows] = await Promise.all([
    loadBuilds(window.from, window.to),
    loadBuilds(window.prevFrom, window.prevTo),
    releaseDays(window),
    latestVersion(),
    nativeErrors(window),
  ]);
  const releasesNow = releases.filter(inPeriod('now'));
  const byVersion = errorsByVersion(errorRows);
  const errorsBefore = total(errorRows.filter(inPeriod('before')).map((row) => row.count));
  const startedAt = (row: BuildRow) => row.created_at;
  const perBucket = (rows: readonly BuildRow[]) => bucketSeries(rows, startedAt, window, (inBucket) => inBucket.length);
  const versionNames = new Map([...byVersion.keys()].filter((key) => key !== 'none').map((key) => [key, key]));
  const split = (keys: readonly string[], values: Iterable<string>) => fixedSlices(keys, tally(values));

  return linkEverything(
    {
      kpis: releaseKpis(
        figuresFor(current, releasesNow, total([...byVersion.values()])),
        figuresFor(previous, releases.filter(inPeriod('before')), errorsBefore),
        latest
      ),
      trends: [
        trend('app_build_activity', window, [
          { key: 'app_android_builds', values: perBucket(onPlatform(current, 'ANDROID')) },
          { key: 'app_ios_builds', values: perBucket(onPlatform(current, 'IOS')) },
          {
            key: 'app_store_releases',
            values: seriesFromDays(releasesNow.map((row) => ({ _id: row._id.day, value: row.count })), window),
          },
        ], 'COUNT', ANDROID),
        trend('app_build_outcomes', window, [
          { key: 'app_successful_builds', values: perBucket(current.filter((row) => row.status === 'SUCCESS')) },
          { key: 'app_failed_builds', values: perBucket(current.filter((row) => row.status === 'FAILED')) },
        ], 'COUNT', ANDROID),
        trend('app_build_time', window, [
          {
            key: 'app_avg_build_time',
            values: bucketSeries(current, startedAt, window, (inBucket) => Math.round(average(buildTimes(inBucket)))),
          },
        ], 'DURATION', ANDROID),
      ],
      breakdowns: [
        breakdown('app_builds_by_platform', split(PLATFORMS, current.map((row) => row.platform)), { ordered: true }),
        breakdown('app_builds_by_status', split(BUILD_STATUSES, current.map(statusKey)), { ordered: true }),
        breakdown('app_builds_by_trigger', split(TRIGGERS, current.map((row) => row.trigger_source)), { ordered: true }),
        breakdown('app_builds_by_env', split(ENVIRONMENTS, current.map((row) => row.app_env)), { ordered: true }),
        breakdown('app_releases_by_track', trackSlices(releasesNow), { ordered: true }),
        breakdown('app_errors_by_version', topSlices(byVersion, versionNames), { link: ERROR_LOGS }),
      ],
      leaderboard: { ...versionLeaderboard(current, byVersion), link: ANDROID },
    },
    ANDROID
  );
}
