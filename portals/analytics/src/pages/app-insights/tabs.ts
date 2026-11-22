import type { AnalyticsPageSpec } from '../entity-analytics/pages';
import type { AppInsightStore } from './queries';

/**
 * App Insights' three tabs. Each is one Analytics dashboard (its own entity,
 * its own saved layout) and names the stores it reads, which decides the
 * configuration-required state, what Sync now syncs and which data tables
 * show. The tab is the page's platform filter, and lives in the URL
 * (`?selectedtab=`), so a link opens the same tab.
 *
 * Translation keys are written out literally for the localization gate.
 */

export type AppInsightsTab = 'overview' | 'google-play' | 'app-store';

export interface AppInsightsTabSpec {
  value: AppInsightsTab;
  label: string;
  stores: readonly AppInsightStore[];
  page: AnalyticsPageSpec;
}

export const APP_INSIGHTS_PATH = '/app-insights';

const OVERVIEW: AppInsightsTabSpec = {
  value: 'overview',
  label: 'analytics.appInsights.tab.overview',
  stores: ['GOOGLE_PLAY', 'APP_STORE'],
  page: {
    path: APP_INSIGHTS_PATH,
    entity: 'APP_INSIGHTS',
    title: 'analytics.page.appInsights.title',
    subtitle: 'analytics.page.appInsights.subtitle',
    note: 'analytics.page.appInsights.note',
    dashboardId: 'analytics.appInsights',
  },
};

export const APP_INSIGHTS_TABS: readonly AppInsightsTabSpec[] = [
  OVERVIEW,
  {
    value: 'google-play',
    label: 'analytics.appInsights.tab.googlePlay',
    stores: ['GOOGLE_PLAY'],
    page: {
      path: APP_INSIGHTS_PATH,
      entity: 'APP_INSIGHTS_ANDROID',
      title: 'analytics.page.appInsights.title',
      subtitle: 'analytics.page.appInsightsAndroid.subtitle',
      note: 'analytics.page.appInsightsAndroid.note',
      dashboardId: 'analytics.appInsightsAndroid',
    },
  },
  {
    value: 'app-store',
    label: 'analytics.appInsights.tab.appStore',
    stores: ['APP_STORE'],
    page: {
      path: APP_INSIGHTS_PATH,
      entity: 'APP_INSIGHTS_IOS',
      title: 'analytics.page.appInsights.title',
      subtitle: 'analytics.page.appInsightsIos.subtitle',
      note: 'analytics.page.appInsightsIos.note',
      dashboardId: 'analytics.appInsightsIos',
    },
  },
];

export const tabSpec = (value: AppInsightsTab): AppInsightsTabSpec =>
  APP_INSIGHTS_TABS.find((tab) => tab.value === value) ?? OVERVIEW;

/** What Sync now syncs from a tab: one store, or both (no argument). */
export const syncStoreOf = (tab: AppInsightsTabSpec): AppInsightStore | null =>
  tab.stores.length === 1 ? (tab.stores[0] ?? null) : null;

/** Each store's name, for status cards, table captions and messages. */
export const STORE_LABEL: Record<AppInsightStore, string> = {
  GOOGLE_PLAY: 'analytics.appInsights.store.googlePlay',
  APP_STORE: 'analytics.appInsights.store.appStore',
};

/** Each Environment Variables field a store can be missing, named for people. */
export const FIELD_LABEL: Partial<Record<string, string>> = {
  service_account_json: 'analytics.appInsights.field.serviceAccountJson',
  package_name: 'analytics.appInsights.field.packageName',
  reports_bucket: 'analytics.appInsights.field.reportsBucket',
  issuer_id: 'analytics.appInsights.field.issuerId',
  key_id: 'analytics.appInsights.field.keyId',
  private_key: 'analytics.appInsights.field.privateKey',
  bundle_id: 'analytics.appInsights.field.bundleId',
};
