import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  AnalyticsBreakdown,
  AnalyticsEntity,
  AnalyticsFormat,
  AnalyticsKpi,
  AnalyticsLeaderboard,
  AnalyticsTrend,
  EntityAnalytics,
  QueryEntityAnalyticsArgs,
} from '@duncit/gql-types';

export type {
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
  query EntityAnalytics($entity: AnalyticsEntity!, $days: Int) {
    entityAnalytics(entity: $entity, days: $days) {
      entity
      period {
        days
        from
        to
        granularity
      }
      kpis {
        key
        value
        previous
        format
        higher_is_better
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
        }
      }
    }
  }
`;
