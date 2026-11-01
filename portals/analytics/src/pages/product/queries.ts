import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  ProductCount,
  ProductElementDetail,
  ProductFunnel,
  ProductRetention,
  ProductScreenDetail,
  ProductSessionDetail,
  ProductTimelineEntry,
  ProductUserHit,
  ProductUserProfile,
  QueryProductElementArgs,
  QueryProductEventNamesArgs,
  QueryProductFunnelArgs,
  QueryProductRetentionArgs,
  QueryProductScreenArgs,
  QueryProductSessionArgs,
  QueryProductUserArgs,
  QueryProductUserSearchArgs,
  QueryProductUserTimelineArgs,
} from '@duncit/gql-types';

export type {
  ProductAnalyticsFilter,
  ProductCount,
  ProductElementRow,
  ProductEvent,
  ProductFunnelStepInput,
  ProductFunnelStepKind,
  ProductOutcome,
  ProductScreenRow,
  ProductSession,
  ProductTimelineEntry,
  ProductUserProfile,
} from '@duncit/gql-types';

/** Analytics > Product: every query its pages read. Each table query is paged on the server. */

const EVENT_FIELDS = `
  id
  event_name
  occurred_at
  user_id
  device_id
  session_id
  platform
  app_version
  screen_name
  previous_screen
  element_id
  element_type
  element_name
  element_text
  duration_ms
  path
  properties_json
`;

const SESSION_FIELDS = `
  session_id
  user_id
  user_name
  device_id
  platform
  app_version
  os_version
  device_type
  started_at
  ended_at
  duration_ms
  events
  screen_views
  clicks
  entry_screen
  exit_screen
`;

export const PRODUCT_SCREENS_TABLE = gql`
  query ProductScreensTable($filter: ProductAnalyticsFilter, $query: TableQueryInput) {
    productScreensTable(filter: $filter, query: $query) {
      total
      rows {
        screen_name
        views
        unique_users
        avg_time_ms
        total_time_ms
        entries
        exits
        exit_rate
        bounce_rate
      }
    }
  }
`;

export const PRODUCT_SCREEN: TypedDocumentNode<{ productScreen: ProductScreenDetail }, QueryProductScreenArgs> = gql`
  query ProductScreen($screen_name: String!, $filter: ProductAnalyticsFilter) {
    productScreen(screen_name: $screen_name, filter: $filter) {
      screen_name
      views
      avg_time_ms
      buckets
      views_series
      users_series
      previous_screens { key count }
      next_screens { key count }
      elements { key count }
      platforms { key count }
    }
  }
`;

export const PRODUCT_ELEMENTS_TABLE = gql`
  query ProductElementsTable($filter: ProductAnalyticsFilter, $query: TableQueryInput) {
    productElementsTable(filter: $filter, query: $query) {
      total
      rows {
        key
        element_id
        element_name
        element_type
        screen_name
        clicks
        unique_users
        repeat_clicks
        screen_views
        ctr
      }
    }
  }
`;

export const PRODUCT_ELEMENT: TypedDocumentNode<{ productElement: ProductElementDetail }, QueryProductElementArgs> = gql`
  query ProductElement($screen_name: String!, $key: String!, $filter: ProductAnalyticsFilter) {
    productElement(screen_name: $screen_name, key: $key, filter: $filter) {
      screen_name
      key
      clicks
      buckets
      clicks_series
      users_series
      platforms { key count }
    }
  }
`;

export const PRODUCT_SESSIONS_TABLE = gql`
  query ProductSessionsTable($filter: ProductAnalyticsFilter, $query: TableQueryInput) {
    productSessionsTable(filter: $filter, query: $query) {
      total
      rows { ${SESSION_FIELDS} }
    }
  }
`;

export const PRODUCT_SESSION: TypedDocumentNode<{ productSession: ProductSessionDetail | null }, QueryProductSessionArgs> = gql`
  query ProductSession($session_id: ID!) {
    productSession(session_id: $session_id) {
      session { ${SESSION_FIELDS} }
      events { ${EVENT_FIELDS} }
    }
  }
`;

export const PRODUCT_EVENTS_TABLE = gql`
  query ProductEventsTable($filter: ProductAnalyticsFilter, $query: TableQueryInput) {
    productEventsTable(filter: $filter, query: $query) {
      total
      rows { ${EVENT_FIELDS} }
    }
  }
`;

export const PRODUCT_EVENT_NAMES: TypedDocumentNode<
  { productEventNames: ProductCount[]; productScreenNames: ProductCount[] },
  QueryProductEventNamesArgs
> = gql`
  query ProductEventNames($filter: ProductAnalyticsFilter) {
    productEventNames(filter: $filter) { key count }
    productScreenNames(filter: $filter) { key count }
  }
`;

export const PRODUCT_FUNNEL: TypedDocumentNode<{ productFunnel: ProductFunnel }, QueryProductFunnelArgs> = gql`
  query ProductFunnel($steps: [ProductFunnelStepInput!]!, $window_days: Int, $filter: ProductAnalyticsFilter) {
    productFunnel(steps: $steps, window_days: $window_days, filter: $filter) {
      window_days
      truncated
      steps {
        kind
        value
        entered
        conversion_from_previous
        conversion_from_start
        dropped
        median_ms_from_previous
      }
    }
  }
`;

export const PRODUCT_RETENTION: TypedDocumentNode<{ productRetention: ProductRetention }, QueryProductRetentionArgs> = gql`
  query ProductRetention($basis: ProductCohortBasis!, $granularity: AnalyticsGranularity, $filter: ProductAnalyticsFilter) {
    productRetention(basis: $basis, granularity: $granularity, filter: $filter) {
      basis
      granularity
      offsets
      average
      rows { cohort size retained }
    }
  }
`;

export const PRODUCT_USER_SEARCH: TypedDocumentNode<{ productUserSearch: ProductUserHit[] }, QueryProductUserSearchArgs> = gql`
  query ProductUserSearch($search: String!) {
    productUserSearch(search: $search) { user_id name contact }
  }
`;

export const PRODUCT_USER: TypedDocumentNode<{ productUser: ProductUserProfile }, QueryProductUserArgs> = gql`
  query ProductUser($user_id: ID!) {
    productUser(user_id: $user_id) {
      user_id
      name
      registered_at
      first_seen_at
      last_seen_at
      platform
      app_version
      city
      country
      first_touch
      last_touch
      sessions
      screen_views
      events
      features_used
      top_features { key count }
      pods_created
      pods_joined
      payments_completed
    }
  }
`;

export const PRODUCT_USER_TIMELINE: TypedDocumentNode<
  { productUserTimeline: ProductTimelineEntry[] },
  QueryProductUserTimelineArgs
> = gql`
  query ProductUserTimeline($user_id: ID!, $before: String, $from: String, $event_names: [String!], $limit: Int) {
    productUserTimeline(user_id: $user_id, before: $before, from: $from, event_names: $event_names, limit: $limit) {
      id
      at
      source
      event_name
      screen_name
      label
      session_id
      platform
      properties_json
    }
  }
`;
