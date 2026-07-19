import { gql } from '@/generated/graphql';

/** Host studio dashboard — identity + wallet + earnings summary +
 * profile/verification health. */
export const HostDashboardDocument = gql(`
  query MobileHostDashboard {
    me {
      user_id
      full_name
    }
    myWallet {
      balance
      currency_symbol
      next_payout_at
    }
    myHostEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
      pods_completed
      this_month_earnings
    }
    myAccountHealth {
      total_score
      band
    }
  }
`);

/** The signed-in host's active pods — drives the dashboard stats, the monthly
 * chart and the participant trend (attendees minus hosts per pod). */
export const HostDashboardPodsDocument = gql(`
  query MobileHostDashboardPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_date_time
      pod_type
      pod_hosts_id
      pod_attendees
    }
  }
`);

/** Host Insights (feature 1): Partner-Portal-synced KPIs (all-time) + pod status
 * distribution (incl. cancelled) and the monthly host-earnings series. */
export const HostInsightsDocument = gql(`
  query MobileHostInsights($from: String!, $to: String!, $months: Int) {
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
`);

/** Venue studio dashboard — my venues + the pods booked at the first one. */
export const VenueDashboardDocument = gql(`
  query MobileVenueDashboard {
    myVenues {
      id
      venue_name
      city
      capacity
      status
      is_active
    }
  }
`);

/** Venue Earnings — summary tiles + payout history across the owner's venues. */
export const VenueEarningsDocument = gql(`
  query MobileVenueEarnings {
    myVenueEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
      pods_completed
      this_month_earnings
    }
    myVenuePayouts {
      id
      pod_title
      status
      amount_requested
      approved_amount
      created_at
      breakdown {
        version
        payout_amount
        share_amount
        commission_pct
        commission_amount
      }
    }
  }
`);

/** Pods at one venue, for the bookings-by-month chart. */
export const VenuePodsDocument = gql(`
  query MobileVenuePods($venue_id: ID!) {
    pods(filter: { venue_id: $venue_id, is_active: true }) {
      id
      pod_date_time
    }
  }
`);

/** ecomm studio dashboard — catalogue stock + price stats. */
export const EcommDashboardDocument = gql(`
  query MobileEcommDashboard {
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
    }
  }
`);
