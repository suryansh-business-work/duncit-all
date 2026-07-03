import { gql } from '@apollo/client';

export const VENUE_SLOT_REQUESTS = gql`
  query VenueSlotRequests($venue_id: ID) {
    venueSlotRequests(venue_id: $venue_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
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
  price: number;
  requested_at: string;
  pod_id: string;
  pod_title: string;
  pod_description: string;
  host_name: string;
  host_email: string;
  host_phone: string;
}
