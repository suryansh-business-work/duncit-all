import { gql } from '@/generated/graphql';

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
