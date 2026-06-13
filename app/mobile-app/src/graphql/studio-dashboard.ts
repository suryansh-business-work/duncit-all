import { gql } from '@/generated/graphql';

/** Host studio dashboard — identity + wallet + profile/verification health. */
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
    myAccountHealth {
      total_score
      band
    }
  }
`);

/** The signed-in host's active pods — drives the dashboard stats. */
export const HostDashboardPodsDocument = gql(`
  query MobileHostDashboardPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_date_time
      pod_type
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
