import { gql } from '@apollo/client';

/** Answers the `VenueOwnerStats` shape in @duncit/utils, which also decides the tiles. */
export const VENUE_OWNER_STATS = gql`
  query VenueOwnerStats($venue_id: ID) {
    venueOwnerStats(venue_id: $venue_id) {
      total_venues
      approved_venues
      total_capacity
      potential_earning
      booked_earning
      upcoming_slots
      booked_slots
      pending_requests
    }
  }
`;
