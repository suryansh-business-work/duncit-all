import type { DuncitColumn } from '@duncit/table';
import type { AppInsightDailyRow, AppInsightDimension, AppInsightStore } from './queries';

type Translate = (key: string) => string;
type MetricField = Exclude<keyof AppInsightDailyRow, 'id' | 'store' | 'day' | 'dimension' | 'key' | '__typename'>;

/** Every metric column a store's daily table shows, in its store's order. Keys literal for the localization gate. */
const STORE_COLUMNS: Record<AppInsightStore, ReadonlyArray<readonly [MetricField, string]>> = {
  GOOGLE_PLAY: [
    ['new_installs', 'analytics.appInsights.col.newInstalls'],
    ['device_installs', 'analytics.appInsights.col.deviceInstalls'],
    ['uninstalls', 'analytics.appInsights.col.uninstalls'],
    ['user_uninstalls', 'analytics.appInsights.col.userUninstalls'],
    ['updates', 'analytics.appInsights.col.upgrades'],
    ['active_devices', 'analytics.appInsights.col.activeDevices30'],
    ['total_installs', 'analytics.appInsights.col.totalInstalls'],
    ['crashes', 'analytics.appInsights.col.crashes'],
    ['anrs', 'analytics.appInsights.col.anrs'],
    ['rating_daily_avg', 'analytics.appInsights.col.dailyRating'],
    ['rating_total_avg', 'analytics.appInsights.col.totalRating'],
    ['reviews_1', 'analytics.appInsights.col.reviews1'],
    ['reviews_2', 'analytics.appInsights.col.reviews2'],
    ['reviews_3', 'analytics.appInsights.col.reviews3'],
    ['reviews_4', 'analytics.appInsights.col.reviews4'],
    ['reviews_5', 'analytics.appInsights.col.reviews5'],
  ],
  APP_STORE: [
    ['first_downloads', 'analytics.appInsights.col.firstDownloads'],
    ['redownloads', 'analytics.appInsights.col.redownloads'],
    ['updates', 'analytics.appInsights.col.updates'],
    ['installs', 'analytics.appInsights.col.installs'],
    ['deletions', 'analytics.appInsights.col.deletions'],
    ['sessions', 'analytics.appInsights.col.sessions'],
    ['active_devices', 'analytics.appInsights.col.activeDevicesDaily'],
    ['crashes', 'analytics.appInsights.col.crashes'],
    ['reviews_1', 'analytics.appInsights.col.reviews1'],
    ['reviews_2', 'analytics.appInsights.col.reviews2'],
    ['reviews_3', 'analytics.appInsights.col.reviews3'],
    ['reviews_4', 'analytics.appInsights.col.reviews4'],
    ['reviews_5', 'analytics.appInsights.col.reviews5'],
  ],
};

const KEY_HEADER: Record<Exclude<AppInsightDimension, 'TOTAL'>, string> = {
  COUNTRY: 'analytics.appInsights.col.country',
  VERSION: 'analytics.appInsights.col.version',
};

/** The day, the slice (when split) and the store's metrics. A metric the store did not report reads blank, never 0. */
export function dailyColumns(
  store: AppInsightStore,
  dimension: AppInsightDimension,
  t: Translate
): Array<DuncitColumn<AppInsightDailyRow>> {
  const columns: Array<DuncitColumn<AppInsightDailyRow>> = [
    { field: 'day', headerName: t('analytics.appInsights.col.day'), type: 'text', width: 130 },
  ];
  if (dimension !== 'TOTAL') {
    columns.push({ field: 'key', headerName: t(KEY_HEADER[dimension]), type: 'text', width: 130 });
  }
  for (const [field, header] of STORE_COLUMNS[store]) {
    columns.push({ field, headerName: t(header), type: 'number', width: 140 });
  }
  return columns;
}

/** What one row is searched by: its day and slice. */
export const dailySearchOf = (row: AppInsightDailyRow) => `${row.day} ${row.key}`;
