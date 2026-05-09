import { gql } from '@apollo/client';

export const VENUES = gql`
  query Venues($status: VenueStatus) {
    venues(status: $status) {
      id
      venue_name
      venue_type
      city
      capacity
      status
      step_completed
      submitted_at
      reviewer_notes
      owner_name
      owner_email
      owner_phone
      gstin
      pan
      documents {
        type
        url
      }
    }
  }
`;

export const APPROVE = gql`
  mutation ApproveVenue($id: ID!, $notes: String) {
    approveVenue(venue_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

export const REJECT = gql`
  mutation RejectVenue($id: ID!, $notes: String!) {
    rejectVenue(venue_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
