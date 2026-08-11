import { gql } from '@apollo/client';

/**
 * The same three operations the partner console uses.
 *
 * A venue owner who works from their phone should not have to open a laptop to
 * say yes — a pod stays unlisted until its slot is approved, so this is the
 * step everything downstream waits on.
 */
export const VENUE_SLOT_REQUESTS = gql`
  query VenueSlotRequests($venue_id: ID) {
    venueSlotRequests(venue_id: $venue_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
      whole_day
      price
      requested_at
      pod_id
      pod_title
      pod_description
      host_name
      host_email
      host_phone
    }
  }
`;

export const MY_VENUES = gql`
  query MyVenuesForSlots {
    myVenues {
      id
      venue_name
    }
  }
`;

export const APPROVE_SLOT_REQUEST = gql`
  mutation ApproveVenueSlotRequest($slot_id: ID!) {
    approveVenueSlotRequest(slot_id: $slot_id) {
      id
      status
    }
  }
`;

export const DECLINE_SLOT_REQUEST = gql`
  mutation DeclineVenueSlotRequest($slot_id: ID!, $reason: String) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason) {
      id
      status
    }
  }
`;

export interface SlotRequestRow {
  slot_id: string;
  venue_id: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  /** A whole-day (or whole-date-range) booking. */
  whole_day: boolean;
  price: number;
  requested_at: string;
  pod_id: string;
  pod_title: string;
  pod_description: string;
  host_name: string;
  host_email: string;
  host_phone: string;
}

export const ALL_VENUES = 'ALL';
