import type { PageCopy } from './types';

/** Tech > Environment Variables. */
export const ENV_KEYS_COPY: PageCopy = {
  kpis: {
    env_entries: { title: 'analytics.kpi.envEntries', hint: 'analytics.kpi.envEntriesHint' },
    env_new_entries: { title: 'analytics.kpi.envNewEntries', hint: 'analytics.kpi.envNewEntriesHint' },
    env_active: { title: 'analytics.kpi.envActive', hint: 'analytics.kpi.envActiveHint' },
    env_services_ready: { title: 'analytics.kpi.envServicesReady', hint: 'analytics.kpi.envServicesReadyHint' },
    env_services_missing: { title: 'analytics.kpi.envServicesMissing', hint: 'analytics.kpi.envServicesMissingHint' },
    env_failing: { title: 'analytics.kpi.envFailing', hint: 'analytics.kpi.envFailingHint' },
    env_untested: { title: 'analytics.kpi.envUntested', hint: 'analytics.kpi.envUntestedHint' },
    env_tested: { title: 'analytics.kpi.envTested', hint: 'analytics.kpi.envTestedHint' },
  },
  trends: {
    env_activity: { title: 'analytics.trend.envActivity', hint: 'analytics.trend.envActivityHint' },
    env_growth: { title: 'analytics.trend.envGrowth', hint: 'analytics.trend.envGrowthHint' },
  },
  series: {
    env_tested: 'analytics.series.envTested',
  },
  breakdowns: {
    env_by_category: 'analytics.breakdown.envByCategory',
    env_test_health: 'analytics.breakdown.envTestHealth',
    env_status: 'analytics.breakdown.envStatus',
    env_test_age: 'analytics.breakdown.envTestAge',
    env_by_portal: 'analytics.breakdown.envByPortal',
  },
  slices: {
    env_test_health: {
      PASSING: 'analytics.slice.envPassing',
      FAILING: 'analytics.slice.envFailing',
      UNTESTED: 'analytics.slice.envUntested',
    },
    env_status: {
      DEFAULT: 'analytics.slice.envDefault',
      ACTIVE: 'analytics.slice.envActiveNotDefault',
      INACTIVE: 'analytics.slice.inactive',
    },
    env_test_age: {
      tested_7d: 'analytics.slice.tested7d',
      tested_30d: 'analytics.slice.tested30d',
      tested_90d: 'analytics.slice.tested90d',
      tested_older: 'analytics.slice.testedOlder',
      tested_never: 'analytics.slice.testedNever',
    },
  },
  leaderboards: {
    env_categories: {
      title: 'analytics.leaderboard.envCategories',
      hint: 'analytics.leaderboard.envCategoriesHint',
      name: 'analytics.leaderboard.service',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    entries: 'analytics.leaderboard.entries',
    active: 'analytics.leaderboard.active',
    passing: 'analytics.leaderboard.passing',
    failing: 'analytics.leaderboard.failing',
    untested: 'analytics.leaderboard.untested',
  },
};
