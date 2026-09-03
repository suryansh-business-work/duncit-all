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

/**
 * Every venue the signed-in partner owns, newest first — the switcher's list
 * AND the detail of whichever one it lands on.
 *
 * This used to be `myVenue`, which answers with the server's own pick and can
 * therefore only ever show one venue. Reading the list instead is what makes
 * switching possible, and costs no extra round trip: `myVenues` already returns
 * the full venue, so the page still asks exactly one question here.
 */
export const MY_VENUES_DETAILS = gql`
  query MyVenuesDetails {
    myVenues {
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
