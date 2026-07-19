import { gql } from '@apollo/client';

/** Identity + wallet + account/verification health for the host dashboard. */
export const HOST_DASHBOARD_ME = gql`
  query HostDashboardMe {
    me {
      user_id
      full_name
    }
    myWallet {
      balance
      currency_symbol
      next_payout_at
    }
    myAccountHealth {
      total_score
      band
    }
    myHostEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
      pods_completed
      this_month_earnings
    }
  }
`;

/** The signed-in host's active pods — drives stats, the monthly chart and the
 * participant trend (attendees minus hosts per pod). */
export const HOST_DASHBOARD_PODS = gql`
  query HostDashboardPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_date_time
      pod_type
      pod_hosts_id
      pod_attendees
    }
  }
`;

/** Host Insights (feature 1): Partner-Portal-synced KPIs (all-time) + the pod
 * status distribution (incl. cancelled) and monthly host-earnings series. */
export const HOST_INSIGHTS = gql`
  query HostInsights($from: String!, $to: String!, $months: Int) {
    partnerDashboard(from: $from, to: $to) {
      host {
        number_of_pods
        host_earning
      }
    }
    hostInsights(months: $months) {
      status_counts {
        upcoming
        ongoing
        completed
        cancelled
      }
      monthly_earnings {
        month
        total
      }
    }
  }
`;
