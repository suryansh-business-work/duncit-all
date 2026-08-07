import { gql } from '@/generated/graphql';

/**
 * Slot requests, for a venue owner on their phone.
 *
 * The same three operations the partner console and mWeb use — a pod stays
 * unlisted until its slot is approved, so this is the step everything
 * downstream waits on, and it should not need a laptop.
 */
export const VenueSlotRequestsDocument = gql(`
  query MobileVenueSlotRequests($venue_id: ID) {
    myVenues {
      id
      venue_name
    }
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
`);

export const ApproveVenueSlotRequestDocument = gql(`
  mutation MobileApproveVenueSlotRequest($slot_id: ID!) {
    approveVenueSlotRequest(slot_id: $slot_id) {
      id
      status
    }
  }
`);

export const DeclineVenueSlotRequestDocument = gql(`
  mutation MobileDeclineVenueSlotRequest($slot_id: ID!, $reason: String) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason) {
      id
      status
    }
  }
`);
