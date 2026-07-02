import { gql } from '@apollo/client';

export const VENUE_SLOTS = gql`
  query VenueSlots($venue_id: ID!, $from: String, $to: String) {
    venueSlots(venue_id: $venue_id, from: $from, to: $to) {
      id
      venue_id
      start_at
      end_at
      price
      status
      booked_by_pod_id
      booked_pod_title
      notes
      created_at
    }
  }
`;

export const VENUE_LOOKUP = gql`
  query VenueLookup($venue_id: ID!) {
    myVenues {
      id
      venue_name
      status
      city
      locality
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
  price: number;
  status: 'AVAILABLE' | 'PENDING' | 'BOOKED' | 'BLOCKED';
  booked_by_pod_id: string | null;
  booked_pod_title: string | null;
  notes: string;
  created_at: string;
}
