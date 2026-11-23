import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  AppInsightDailyRow,
  AppInsightIntegration,
  AppInsightSyncLog,
  MutationSyncAppInsightsArgs,
  QueryAppInsightsDailyArgs,
  QueryAppInsightsSyncLogsArgs,
} from '@duncit/gql-types';

export type { AppInsightDailyRow, AppInsightIntegration, AppInsightSyncLog };
export type { AppInsightDimension, AppInsightStatus, AppInsightStore } from '@duncit/gql-types';

const INTEGRATION_FIELDS = gql`
  fragment AppInsightIntegrationFields on AppInsightIntegration {
    store
    configured
    missing
    problem
    status
    last_success_at
    last_attempt_at
    last_error
    first_day
    last_day
    setup_url
  }
`;

/** Both stores' integrations — what the status cards and the configuration-required state read. */
export const APP_INSIGHTS_STATUS: TypedDocumentNode<{ appInsightsStatus: AppInsightIntegration[] }> = gql`
  query AppInsightsStatus {
    appInsightsStatus {
      ...AppInsightIntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`;

/** Sync now — one store or both; answers with the integrations, now SYNCING. */
export const SYNC_APP_INSIGHTS: TypedDocumentNode<
  { syncAppInsights: AppInsightIntegration[] },
  MutationSyncAppInsightsArgs
> = gql`
  mutation SyncAppInsights($store: AppInsightStore) {
    syncAppInsights(store: $store) {
      ...AppInsightIntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`;

export const APP_INSIGHTS_SYNC_LOGS: TypedDocumentNode<
  { appInsightsSyncLogs: AppInsightSyncLog[] },
  QueryAppInsightsSyncLogsArgs
> = gql`
  query AppInsightsSyncLogs($store: AppInsightStore, $limit: Int) {
    appInsightsSyncLogs(store: $store, limit: $limit) {
      id
      store
      trigger
      outcome
      started_at
      finished_at
      duration_ms
      sources_read
      sources_skipped
      rows_written
      api_calls
      retries
      message
    }
  }
`;

export const APP_INSIGHTS_DAILY: TypedDocumentNode<
  { appInsightsDaily: AppInsightDailyRow[] },
  QueryAppInsightsDailyArgs
> = gql`
  query AppInsightsDaily($store: AppInsightStore!, $from: String!, $to: String!, $dimension: AppInsightDimension) {
    appInsightsDaily(store: $store, from: $from, to: $to, dimension: $dimension) {
      id
      store
      day
      dimension
      key
      new_installs
      device_installs
      uninstalls
      user_uninstalls
      updates
      active_devices
      total_installs
      crashes
      anrs
      rating_daily_avg
      rating_total_avg
      first_downloads
      redownloads
      installs
      deletions
      sessions
      reviews_1
      reviews_2
      reviews_3
      reviews_4
      reviews_5
    }
  }
`;

/** Every query the page reads, refetched when a sync finishes. */
export const APP_INSIGHTS_QUERIES = ['EntityAnalytics', 'AppInsightsDaily', 'AppInsightsSyncLogs'];
