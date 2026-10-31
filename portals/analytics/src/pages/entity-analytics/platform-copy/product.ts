import type { PageCopy } from './types';

/**
 * Product > Overview — how the app is used, from its own events. Screens are
 * named by the data (route names, mWeb paths), so only the fixed sets — the
 * platforms and device types — need words of their own.
 */
export const PRODUCT_COPY: PageCopy = {
  kpis: {
    prd_registered_users: { title: 'analytics.product.kpi.registeredUsers', hint: 'analytics.product.kpi.registeredUsersHint' },
    prd_active_users: { title: 'analytics.product.kpi.activeUsers', hint: 'analytics.product.kpi.activeUsersHint' },
    prd_dau: { title: 'analytics.product.kpi.dau', hint: 'analytics.product.kpi.dauHint' },
    prd_wau: { title: 'analytics.product.kpi.wau', hint: 'analytics.product.kpi.wauHint' },
    prd_mau: { title: 'analytics.product.kpi.mau', hint: 'analytics.product.kpi.mauHint' },
    prd_new_users: { title: 'analytics.product.kpi.newUsers', hint: 'analytics.product.kpi.newUsersHint' },
    prd_returning_users: { title: 'analytics.product.kpi.returningUsers', hint: 'analytics.product.kpi.returningUsersHint' },
    prd_new_devices: { title: 'analytics.product.kpi.newDevices', hint: 'analytics.product.kpi.newDevicesHint' },
    prd_sessions: { title: 'analytics.product.kpi.sessions', hint: 'analytics.product.kpi.sessionsHint' },
    prd_avg_session: { title: 'analytics.product.kpi.avgSession', hint: 'analytics.product.kpi.avgSessionHint' },
    prd_screens_per_session: { title: 'analytics.product.kpi.screensPerSession', hint: 'analytics.product.kpi.screensPerSessionHint' },
    prd_conversion_rate: { title: 'analytics.product.kpi.conversionRate', hint: 'analytics.product.kpi.conversionRateHint' },
    prd_d1_retention: { title: 'analytics.product.kpi.d1Retention', hint: 'analytics.product.kpi.d1RetentionHint' },
    prd_d7_retention: { title: 'analytics.product.kpi.d7Retention', hint: 'analytics.product.kpi.d7RetentionHint' },
    prd_d30_retention: { title: 'analytics.product.kpi.d30Retention', hint: 'analytics.product.kpi.d30RetentionHint' },
    prd_churn_rate: { title: 'analytics.product.kpi.churnRate', hint: 'analytics.product.kpi.churnRateHint' },
  },
  trends: {
    prd_people_trend: { title: 'analytics.product.trend.people', hint: 'analytics.product.trend.peopleHint' },
    prd_sessions_trend: { title: 'analytics.product.trend.sessions', hint: 'analytics.product.trend.sessionsHint' },
  },
  series: {
    prd_series_active: 'analytics.product.series.active',
    prd_series_new: 'analytics.product.series.new',
    prd_series_returning: 'analytics.product.series.returning',
    prd_series_sessions: 'analytics.product.series.sessions',
    prd_series_views: 'analytics.product.series.views',
    prd_series_users: 'analytics.product.series.users',
    prd_series_clicks: 'analytics.product.series.clicks',
  },
  breakdowns: {
    prd_platforms: 'analytics.product.breakdown.platforms',
    prd_app_versions: 'analytics.product.breakdown.appVersions',
    prd_device_types: 'analytics.product.breakdown.deviceTypes',
    prd_os_versions: 'analytics.product.breakdown.osVersions',
    prd_entry_screens: 'analytics.product.breakdown.entryScreens',
  },
  slices: {
    prd_platforms: {
      ios: 'analytics.product.platform.ios',
      android: 'analytics.product.platform.android',
      web: 'analytics.product.platform.web',
      mweb: 'analytics.product.platform.mweb',
    },
    prd_device_types: {
      phone: 'analytics.product.device.phone',
      tablet: 'analytics.product.device.tablet',
      desktop: 'analytics.product.device.desktop',
    },
  },
  leaderboards: {
    prd_top_screens: {
      title: 'analytics.product.leaderboard.topScreens',
      hint: 'analytics.product.leaderboard.topScreensHint',
      name: 'analytics.product.leaderboard.screen',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    prd_col_views: 'analytics.product.column.views',
    prd_col_users: 'analytics.product.column.users',
    prd_col_avg_time: 'analytics.product.column.avgTime',
    prd_col_exit_rate: 'analytics.product.column.exitRate',
  },
};
