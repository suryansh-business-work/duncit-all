import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  AnalyticsCity,
  AnalyticsCompare,
  AnalyticsBreakdown,
  AnalyticsEntity,
  AnalyticsFormat,
  AnalyticsKpi,
  AnalyticsLeaderboard,
  AnalyticsTrend,
  EntityAnalytics,
  MutationSetAnalyticsTargetArgs,
  QueryEntityAnalyticsArgs,
} from '@duncit/gql-types';

export type { AnalyticsCompare } from '@duncit/gql-types';
export type {
  AnalyticsCity,
  AnalyticsBreakdown,
  AnalyticsEntity,
  AnalyticsFormat,
  AnalyticsKpi,
  AnalyticsLeaderboard,
  AnalyticsTrend,
  EntityAnalytics,
};

/** The periods a page can report on. The server clamps anything else to 7–365. */
export const PERIOD_OPTIONS = [
  { days: 7, label: 'analytics.page.days7' },
  { days: 30, label: 'analytics.page.days30' },
  { days: 90, label: 'analytics.page.days90' },
  { days: 365, label: 'analytics.page.days365' },
] as const;

export const DEFAULT_PERIOD = 30;

export const ENTITY_ANALYTICS: TypedDocumentNode<
  { entityAnalytics: EntityAnalytics },
  QueryEntityAnalyticsArgs
> = gql`
  query EntityAnalytics(
    $entity: AnalyticsEntity!
    $days: Int
    $from: String
    $to: String
    $compare: AnalyticsCompare
    $city: ID
  ) {
    entityAnalytics(entity: $entity, days: $days, from: $from, to: $to, compare: $compare, city: $city) {
      entity
      details_url
      period {
        days
        from
        to
        granularity
        compare
        previous_from
        previous_to
        city
      }
      kpis {
        key
        value
        previous
        format
        higher_is_better
        url
        target
        target_goal
      }
      trends {
        key
        format
        granularity
        buckets
        series {
          key
          values
        }
        url
      }
      breakdowns {
        key
        format
        scope
        ordered
        slices {
          key
          label
          value
        }
        url
      }
      leaderboard {
        key
        columns {
          key
          format
        }
        rows {
          id
          name
          caption
          values
          url
        }
        url
      }
    }
  }
`;

/** The cities a page can be narrowed to (Pods, Clubs). */
export const ANALYTICS_CITIES: TypedDocumentNode<{ analyticsCities: AnalyticsCity[] }> = gql`
  query AnalyticsCities {
    analyticsCities {
      id
      name
    }
  }
`;

/** Set a tile's goal, or clear it with a null value. */
export const SET_ANALYTICS_TARGET: TypedDocumentNode<{ setAnalyticsTarget: boolean }, MutationSetAnalyticsTargetArgs> = gql`
  mutation SetAnalyticsTarget($entity: AnalyticsEntity!, $key: String!, $value: Float) {
    setAnalyticsTarget(entity: $entity, key: $key, value: $value)
  }
`;
