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

/** The signed-in host's active pods — drives stats + the monthly chart. */
export const HOST_DASHBOARD_PODS = gql`
  query HostDashboardPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_date_time
      pod_type
    }
  }
`;
