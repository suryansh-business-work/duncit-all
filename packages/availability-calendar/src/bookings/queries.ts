import { gql } from '@apollo/client';
import type { VenueBooking, VenueSlotRequestHistoryRow } from '@duncit/gql-types';

export type UpcomingBooking = Pick<
  VenueBooking,
  'slot_id' | 'venue_name' | 'pod_id' | 'pod_title' | 'start_at' | 'end_at' | 'space_label' | 'venue_payout'
>;

export type SlotRequestHistoryRow = Omit<VenueSlotRequestHistoryRow, '__typename'>;

/** Confirmed instant bookings at the owner's venues (one venue when venue_id is set), soonest first. */
export const MY_VENUE_UPCOMING_BOOKINGS = gql`
  query MyVenueUpcomingBookings($venue_id: ID, $limit: Int) {
    myVenueUpcomingBookings(venue_id: $venue_id, limit: $limit) {
      slot_id
      venue_name
      pod_id
      pod_title
      start_at
      end_at
      space_label
      venue_payout
    }
  }
`;

/** Slot requests from before instant booking — read-only history. */
export const MY_VENUE_SLOT_REQUEST_HISTORY = gql`
  query MyVenueSlotRequestHistory($venue_id: ID, $limit: Int) {
    myVenueSlotRequestHistory(venue_id: $venue_id, limit: $limit) {
      slot_id
      venue_name
      pod_title
      start_at
      end_at
      status
      decision
      decided_at
      decline_reason
    }
  }
`;
