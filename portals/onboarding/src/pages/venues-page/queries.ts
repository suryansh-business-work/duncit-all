import { gql } from '@apollo/client';

export const VENUES = gql`
  query Venues($status: VenueStatus) {
    venues(status: $status) {
      id
      venue_name
      venue_type
      description
      amenities
      facilities
      security
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
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
      status
      is_active
      pod_count
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

/** Row shape used by the venues table columns; rows also carry the full
 * VenueRowFields selection so the Edit/Review dialogs can reuse the row object. */
export interface VenueRow {
  id: string;
  venue_name: string;
  venue_type?: string | null;
  city?: string | null;
  locality?: string | null;
  postal_code?: string | null;
  capacity?: number | null;
  status: string;
  is_active?: boolean | null;
  pod_count?: number | null;
  submitted_at?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  venue_commission_pct?: number | null;
  venue_category?: {
    super_category_name?: string | null;
    category_name?: string | null;
    sub_category_name?: string | null;
  } | null;
}

/** Same selection as VENUES rows (+ created_at for the hidden Created filter
 * column) so table rows keep feeding the Edit/Review dialogs without refetch. */
const VENUE_ROW_FIELDS = gql`
  fragment VenueRowFields on Venue {
    id
    venue_name
    venue_type
    description
    amenities
    facilities
    security
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
      super_category_id
      category_id
      sub_category_id
      super_category_name
      category_name
      sub_category_name
    }
    status
    is_active
    pod_count
    step_completed
    submitted_at
    created_at
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
`;

export const VENUES_TABLE = gql`
  query VenuesTable($query: TableQueryInput) {
    venuesTable(query: $query) {
      total
      rows {
        ...VenueRowFields
      }
    }
  }
  ${VENUE_ROW_FIELDS}
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

export const SET_VENUE_ACTIVE = gql`
  mutation SetVenueActive($id: ID!, $active: Boolean!) {
    setVenueActive(venue_doc_id: $id, active: $active) {
      id
      is_active
    }
  }
`;

export const DELETE_VENUE = gql`
  mutation DeleteVenue($id: ID!, $email: String!, $password: String!) {
    deleteVenue(venue_doc_id: $id, email: $email, password: $password)
  }
`;

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

/** Status options for the table's select filter ('' All entry excluded). */
export const STATUS_OPTIONS = STATUSES.filter(Boolean).map((s) => ({ value: s, label: s }));
