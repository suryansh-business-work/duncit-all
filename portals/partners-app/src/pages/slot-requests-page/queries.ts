import { gql } from '@apollo/client';

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
