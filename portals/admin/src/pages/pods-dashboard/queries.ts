import { gql } from '@apollo/client';

/** The whole Pods dashboard in one read — see server/modules/pods/pod.dashboard. */
export const POD_DASHBOARD = gql`
  query AdminPodDashboard($days: Int) {
    podDashboard(days: $days) {
      days
      totals {
        total
        upcoming
        completed
        cancelled
        awaiting_venue
        live_today
      }
      seats {
        spots_total
        seats_filled
        occupancy_pct
      }
      money {
        revenue_total
        payments_count
        refunded_total
        average_ticket
      }
      ratings {
        total
        overall_average
        aspects {
          aspect
          average
          count
        }
      }
      top_rated {
        ...DashboardPodFields
      }
      needs_attention {
        ...DashboardPodFields
      }
      upcoming {
        ...DashboardPodFields
      }
      created_trend {
        date
        count
      }
    }
  }

  fragment DashboardPodFields on PodDashboardPod {
    id
    pod_id
    title
    starts_at
    spots
    filled
    rating_average
    rating_count
  }
`;

export interface DashboardPod {
  id: string;
  pod_id: string;
  title: string;
  starts_at: string | null;
  spots: number;
  filled: number;
  rating_average: number | null;
  rating_count: number;
}

export interface DashboardAspect {
  aspect: string;
  average: number;
  count: number;
}

/** How long a window the money, ratings and trend cover. */
export const WINDOW_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];
