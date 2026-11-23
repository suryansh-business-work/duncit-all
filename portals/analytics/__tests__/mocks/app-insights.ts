import type { MockedResponse } from '@apollo/client/testing';
import {
  APP_INSIGHTS_STATUS,
  type AppInsightDailyRow,
  type AppInsightIntegration,
  type AppInsightSyncLog,
} from '../../src/pages/app-insights/queries';

/** One store's integration as the server answers it. */
export const integration = (over: Partial<AppInsightIntegration> = {}): AppInsightIntegration => ({
  __typename: 'AppInsightIntegration',
  store: 'GOOGLE_PLAY',
  configured: true,
  missing: [],
  problem: null,
  status: 'CONNECTED',
  last_success_at: '2026-11-22T04:00:00.000Z',
  last_attempt_at: '2026-11-22T04:00:00.000Z',
  last_error: null,
  first_day: '2024-10-01',
  last_day: '2026-11-20',
  setup_url: 'https://tech.example.test/?selectedtab_category=GOOGLE_PLAY',
  ...over,
});

export const disconnectedApple = (over: Partial<AppInsightIntegration> = {}) =>
  integration({
    store: 'APP_STORE',
    configured: false,
    missing: ['key_id', 'private_key'],
    status: 'DISCONNECTED',
    last_success_at: null,
    last_attempt_at: null,
    first_day: null,
    last_day: null,
    setup_url: 'https://tech.example.test/?selectedtab_category=APP_STORE_CONNECT',
    ...over,
  });

export const statusMock = (integrations: AppInsightIntegration[]): MockedResponse => ({
  request: { query: APP_INSIGHTS_STATUS },
  result: { data: { appInsightsStatus: integrations } },
});

/** A stored day with every requested field, unreported metrics null. */
export const dailyRow = (over: Partial<AppInsightDailyRow> = {}): AppInsightDailyRow => ({
  __typename: 'AppInsightDailyRow',
  id: 'd1',
  store: 'GOOGLE_PLAY',
  day: '2026-11-20',
  dimension: 'TOTAL',
  key: '',
  new_installs: 12,
  device_installs: 14,
  uninstalls: 3,
  user_uninstalls: 2,
  updates: 40,
  active_devices: 4100,
  total_installs: 9000,
  crashes: 1,
  anrs: 0,
  rating_daily_avg: 4.5,
  rating_total_avg: 4.3,
  first_downloads: null,
  redownloads: null,
  installs: null,
  deletions: null,
  sessions: null,
  reviews_1: 0,
  reviews_2: 0,
  reviews_3: 0,
  reviews_4: 1,
  reviews_5: 2,
  ...over,
});

export const syncLog = (over: Partial<AppInsightSyncLog> = {}): AppInsightSyncLog => ({
  __typename: 'AppInsightSyncLog',
  id: 'log1',
  store: 'GOOGLE_PLAY',
  trigger: 'SCHEDULE',
  outcome: 'SUCCESS',
  started_at: '2026-11-22T04:00:00.000Z',
  finished_at: '2026-11-22T04:00:04.200Z',
  duration_ms: 4200,
  sources_read: 2,
  sources_skipped: 9,
  rows_written: 120,
  api_calls: 14,
  retries: 1,
  message: 'Read 2 report file(s), 9 unchanged.',
  ...over,
});
