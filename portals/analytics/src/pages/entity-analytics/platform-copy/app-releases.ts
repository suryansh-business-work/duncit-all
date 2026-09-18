import type { PageCopy } from './types';

/** Tech > App releases. */
export const APP_RELEASES_COPY: PageCopy = {
  kpis: {
    app_builds: { title: 'analytics.kpi.appBuilds', hint: 'analytics.kpi.appBuildsHint' },
    app_android_builds: { title: 'analytics.kpi.appAndroidBuilds', hint: 'analytics.kpi.appAndroidBuildsHint' },
    app_ios_builds: { title: 'analytics.kpi.appIosBuilds', hint: 'analytics.kpi.appIosBuildsHint' },
    app_build_success_rate: { title: 'analytics.kpi.appBuildSuccessRate', hint: 'analytics.kpi.appBuildSuccessRateHint' },
    app_failed_builds: { title: 'analytics.kpi.appFailedBuilds', hint: 'analytics.kpi.appFailedBuildsHint' },
    app_avg_build_time: { title: 'analytics.kpi.appAvgBuildTime', hint: 'analytics.kpi.appAvgBuildTimeHint' },
    app_versions_built: { title: 'analytics.kpi.appVersionsBuilt', hint: 'analytics.kpi.appVersionsBuiltHint' },
    app_store_releases: { title: 'analytics.kpi.appStoreReleases', hint: 'analytics.kpi.appStoreReleasesHint' },
    app_production_releases: {
      title: 'analytics.kpi.appProductionReleases',
      hint: 'analytics.kpi.appProductionReleasesHint',
    },
    app_native_errors: { title: 'analytics.kpi.appNativeErrors', hint: 'analytics.kpi.appNativeErrorsHint' },
    app_latest_version_builds: {
      title: 'analytics.kpi.appLatestVersionBuilds',
      hint: 'analytics.kpi.appLatestVersionBuildsHint',
    },
    app_latest_version_released: {
      title: 'analytics.kpi.appLatestVersionReleased',
      hint: 'analytics.kpi.appLatestVersionReleasedHint',
    },
  },
  trends: {
    app_build_activity: { title: 'analytics.trend.appBuildActivity', hint: 'analytics.trend.appBuildActivityHint' },
    app_build_outcomes: { title: 'analytics.trend.appBuildOutcomes', hint: 'analytics.trend.appBuildOutcomesHint' },
    app_build_time: { title: 'analytics.trend.appBuildTime', hint: 'analytics.trend.appBuildTimeHint' },
  },
  series: {
    app_successful_builds: 'analytics.series.appSuccessfulBuilds',
  },
  breakdowns: {
    app_builds_by_platform: 'analytics.breakdown.appBuildsByPlatform',
    app_builds_by_status: 'analytics.breakdown.appBuildsByStatus',
    app_builds_by_trigger: 'analytics.breakdown.appBuildsByTrigger',
    app_builds_by_env: 'analytics.breakdown.appBuildsByEnv',
    app_releases_by_track: 'analytics.breakdown.appReleasesByTrack',
    app_errors_by_version: 'analytics.breakdown.appErrorsByVersion',
  },
  slices: {
    app_builds_by_platform: {
      ANDROID: 'analytics.slice.appAndroid',
      IOS: 'analytics.slice.appIos',
    },
    app_builds_by_status: {
      SUCCESS: 'analytics.slice.appBuildSucceeded',
      FAILED: 'analytics.slice.appBuildFailed',
      IN_PROGRESS: 'analytics.slice.appBuildInProgress',
    },
    app_builds_by_trigger: {
      PUSH: 'analytics.slice.appTriggerPush',
      PORTAL: 'analytics.slice.appTriggerPortal',
    },
    app_builds_by_env: {
      PRODUCTION: 'analytics.slice.appEnvProduction',
      STAGING: 'analytics.slice.appEnvStaging',
    },
    app_releases_by_track: {
      INTERNAL: 'analytics.slice.appTrackInternal',
      PRODUCTION: 'analytics.slice.appTrackProduction',
    },
  },
  leaderboards: {
    app_versions: {
      title: 'analytics.leaderboard.appVersions',
      hint: 'analytics.leaderboard.appVersionsHint',
      name: 'analytics.leaderboard.appVersion',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    app_version_android: 'analytics.leaderboard.appVersionAndroid',
    app_version_ios: 'analytics.leaderboard.appVersionIos',
    app_version_failed: 'analytics.leaderboard.appVersionFailed',
    app_version_build_time: 'analytics.leaderboard.appVersionBuildTime',
    app_version_released: 'analytics.leaderboard.appVersionReleased',
    app_version_errors: 'analytics.leaderboard.appVersionErrors',
  },
};
