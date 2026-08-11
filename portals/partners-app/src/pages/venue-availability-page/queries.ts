import { gql } from '@apollo/client';
import { VENUE_SETTINGS_FRAGMENT } from '../register-venue-page/queries';

export const VENUE_SLOTS = gql`
  query VenueSlots($venue_id: ID!, $from: String, $to: String) {
    venueSlots(venue_id: $venue_id, from: $from, to: $to) {
      id
      venue_id
      start_at
      end_at
      whole_day
      price
      space_label
      capacity
      status
      booked_by_pod_id
      booked_pod_title
      notes
      created_at
    }
  }
`;

/**
 * The venue behind the availability calendar. `capacity_items` is what makes
 * each space (e.g. "Court 1") priceable and bookable on its own — without it
 * the recurring dialog and the day drawer collapse to a single "Whole venue"
 * row — and `settings` carries the operating hours, weekly-offs and holidays
 * the calendar greys out.
 */
export const VENUE_LOOKUP = gql`
  query VenueLookup($venue_id: ID!) {
    myVenues {
      id
      venue_name
      status
      city
      locality
      capacity
      capacity_items {
        label
        capacity
      }
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;

export const CREATE_VENUE_SLOTS = gql`
  mutation CreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
    createVenueSlots(input: $input) {
      id
      start_at
      end_at
      price
      status
      notes
    }
  }
`;

export const UPDATE_VENUE_SLOT = gql`
  mutation UpdateVenueSlot($slot_id: ID!, $input: UpdateVenueSlotInput!) {
    updateVenueSlot(slot_id: $slot_id, input: $input) {
      id
      start_at
      end_at
      price
      status
      notes
    }
  }
`;

export const DELETE_VENUE_SLOT = gql`
  mutation DeleteVenueSlot($slot_id: ID!) {
    deleteVenueSlot(slot_id: $slot_id)
  }
`;

export interface VenueSlotRow {
  id: string;
  venue_id: string;
  start_at: string;
  end_at: string;
  /** A whole-day (or whole-date-range) booking. */
  whole_day?: boolean;
  price: number;
  // Optional so a plain calendar VenueSlotRow (no space fields) stays assignable.
  space_label?: string;
  capacity?: number;
  status: 'AVAILABLE' | 'PENDING' | 'BOOKED' | 'BLOCKED';
  booked_by_pod_id: string | null;
  booked_pod_title: string | null;
  notes: string;
  created_at: string;
}
