import { gql } from '@apollo/client';

export const VENUES = gql`
  query Venues($status: VenueStatus) {
    venues(status: $status) {
      id
      venue_name
      venue_type
      description
      cover_image_url
      gallery
      location_id
      country
      country_code
      address_line1
      address_line2
      city
      state
      state_code
      locality
      postal_code
      capacity
      capacity_items {
        label
        capacity
      }
      venue_category {
        super_category_name
        category_name
        sub_category_name
      }
      status
      step_completed
      submitted_at
      reviewer_notes
      owner_name
      owner_email
      owner_phone
      owner_dob
      owner_address
      venue_share_pct
      venue_commission_pct
      gstin
      pan
      bank_account {
        payout_method
        account_holder_name
        account_number
        ifsc_code
        upi_id
      }
      tags
      documents {
        type
        url
      }
    }
  }
`;

export const APPROVE = gql`
  mutation ApproveVenue($id: ID!, $notes: String, $tags: [String!]) {
    approveVenue(venue_doc_id: $id, notes: $notes, tags: $tags) {
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

export const UPDATE_VENUE = gql`
  mutation UpdateVenue(
    $id: ID!
    $step1: VenueStep1Input!
    $step2: VenueStep2Input!
    $step3: VenueStep3Input!
    $status: VenueStatus
  ) {
    adminUpdateVenue(
      venue_doc_id: $id
      step1: $step1
      step2: $step2
      step3: $step3
      status: $status
    ) {
      id
    }
  }
`;

export const SET_VENUE_DEDUCTIONS = gql`
  mutation SetVenueDeductions($id: ID!, $venue_share_pct: Float!, $venue_commission_pct: Float!) {
    setVenueDeductions(venue_doc_id: $id, venue_share_pct: $venue_share_pct, venue_commission_pct: $venue_commission_pct) {
      id
      venue_share_pct
      venue_commission_pct
    }
  }
`;

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
