import { gql } from '@apollo/client';
import { VENUE_DECIDE_POD_SERIES_SDL } from '@duncit/utils';

/** Accept or decline every still-pending date of a recurring pod at once. */
export const VENUE_DECIDE_POD_SERIES = gql(VENUE_DECIDE_POD_SERIES_SDL);

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
      pod_is_free
      series_id
      series_index
      series_total
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
  /** Set when the pod is one date of a recurring series. */
  series_id?: string | null;
  series_index?: number | null;
  series_total?: number | null;
  /** A FREE pod: the host settles the venue directly, so price is 0 and the
   * card shows the free-pod notice instead of it. */
  pod_is_free: boolean;
}
