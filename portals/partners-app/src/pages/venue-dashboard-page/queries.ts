import { gql } from '@apollo/client';

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

export interface VenueOwnerStats {
  total_venues: number;
  approved_venues: number;
  total_capacity: number;
  potential_earning: number;
  booked_earning: number;
  upcoming_slots: number;
  booked_slots: number;
  pending_requests: number;
}

export const emptyVenueOwnerStats: VenueOwnerStats = {
  total_venues: 0,
  approved_venues: 0,
  total_capacity: 0,
  potential_earning: 0,
  booked_earning: 0,
  upcoming_slots: 0,
  booked_slots: 0,
  pending_requests: 0,
};
