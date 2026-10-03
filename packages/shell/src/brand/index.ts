export { BrandLogsPanel, type BrandLogsPanelProps } from './logs/BrandLogsPanel';
export { BRAND_CHANGE_LOGS_TABLE, type BrandChangeLogRow } from './logs/queries';
// The field and old/new value cells any entity change log draws (entity-consoles reuses them).
export {
  renderField as renderChangeLogField,
  renderNew as renderChangeLogNew,
  renderOld as renderChangeLogOld,
  type ChangeLogValueRow,
} from './logs/cells';
export { BrandAnalyticsPanel, type BrandAnalyticsPanelProps } from './analytics/BrandAnalyticsPanel';
export { BrandAnalyticsReport, type BrandAnalyticsReportProps } from './analytics/BrandAnalyticsReport';
export {
  BRAND_ANALYTICS,
  BRAND_ANALYTICS_WINDOWS,
  DEFAULT_BRAND_ANALYTICS_WINDOW,
  trendBarPercents,
  trendPeak,
  type BrandAnalytics,
  type BrandAnalyticsData,
  type BrandAnalyticsPoint,
  type BrandAnalyticsVars,
  type BrandAnalyticsWindow,
  type BrandTopProduct,
} from './analytics/queries';
