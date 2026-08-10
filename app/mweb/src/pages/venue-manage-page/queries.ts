import { gql } from '@apollo/client';

/** Bookings feeding the "Pods at your venue" bar chart (counts only). */
export const PODS_AT_VENUE = gql`
  query PodsAtMyVenue($venue_id: ID!) {
    pods(filter: { venue_id: $venue_id, is_active: true }) {
      id
      pod_date_time
    }
  }
`;

export const MY_VENUE_DETAILS = gql`
  query MyVenueDetails {
    myVenue {
      id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      country
      city
      state
      locality
      postal_code
      amenities
      tags
      status
      approved_at
    }
  }
`;
