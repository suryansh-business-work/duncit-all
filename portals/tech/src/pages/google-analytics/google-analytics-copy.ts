import type { StatusColorMap } from '@duncit/ui';
import type { GoogleAnalyticsSite, TrackedWebsite } from '@duncit/gql-types';

/** Where a website's tag stands: loading, on file but switched off, or not set at all. */
export type TagStatus = 'LIVE' | 'OFF' | 'NOT_SET';

export const tagStatus = (row: Readonly<GoogleAnalyticsSite>): TagStatus => {
  if (!row.measurement_id) return 'NOT_SET';
  return row.enabled ? 'LIVE' : 'OFF';
};

export const TAG_STATUS_COLORS: StatusColorMap = { LIVE: 'info', OFF: 'warning', NOT_SET: 'default' };

// Every key is written out whole: the translation gate finds a key only as a
// quoted literal, never one assembled from the enum value.
export const SITE_LABEL_KEYS: Readonly<Record<TrackedWebsite, string>> = {
  MAIN: 'tech.googleAnalytics.sites.MAIN',
  PARTNERS: 'tech.googleAnalytics.sites.PARTNERS',
  ADS: 'tech.googleAnalytics.sites.ADS',
  EARNWITH: 'tech.googleAnalytics.sites.EARNWITH',
  STATUS: 'tech.googleAnalytics.sites.STATUS',
  ECOMM: 'tech.googleAnalytics.sites.ECOMM',
};

export const TAG_STATUS_KEYS: Readonly<Record<TagStatus, string>> = {
  LIVE: 'tech.googleAnalytics.status.LIVE',
  OFF: 'tech.googleAnalytics.status.OFF',
  NOT_SET: 'tech.googleAnalytics.status.NOT_SET',
};
