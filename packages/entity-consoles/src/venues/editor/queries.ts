import { gql } from '@apollo/client';

/**
 * Everything the venue editor reads and writes.
 *
 * The record is read through the SAME `venue(venue_doc_id:)` query the detail
 * page uses (`../detail/queries`), so the editor can never open a field the
 * detail page cannot show. Only the extra pieces the editor needs live here:
 * the owner picker, the option catalogues, and the four writes.
 */

/** The option catalogues — never hardcoded in a client (rule 2). */
export const VENUE_REGISTRATION_CONFIG = gql`
  query VenueEditorRegistrationConfig {
    venueRegistrationConfig {
      venue_types
      doc_types
      capacity_item_limit
      amenities
      facilities
      security
    }
  }
`;

/** Owner search for a new venue — server-side, so it scales past a page. */
export const OWNER_CANDIDATES = gql`
  query VenueOwnerCandidates($query: TableQueryInput) {
    usersTable(query: $query) {
      total
      rows {
        user_id
        full_name
        email
        phone_number
      }
    }
  }
`;

export const ADMIN_CREATE_VENUE = gql`
  mutation VenueEditorCreate(
    $owner_user_id: ID!
    $step1: VenueStep1Input!
    $step2: VenueStep2Input!
    $step3: VenueStep3Input!
    $submit: Boolean
  ) {
    adminCreateVenue(
      owner_user_id: $owner_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

export const ADMIN_UPDATE_VENUE = gql`
  mutation VenueEditorUpdate(
    $venue_doc_id: ID!
    $step1: VenueStep1Input!
    $step2: VenueStep2Input!
    $step3: VenueStep3Input!
    $status: VenueStatus
  ) {
    adminUpdateVenue(
      venue_doc_id: $venue_doc_id
      step1: $step1
      step2: $step2
      step3: $step3
      status: $status
    ) {
      id
      status
    }
  }
`;

/** Hours, weekly-off, holidays, booking rules, auto-extend, cancellation. */
export const UPDATE_VENUE_SETTINGS = gql`
  mutation VenueEditorSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
    }
  }
`;

export const SET_VENUE_DEDUCTIONS = gql`
  mutation VenueEditorDeductions(
    $venue_doc_id: ID!
    $venue_share_pct: Float!
    $venue_commission_pct: Float!
  ) {
    setVenueDeductions(
      venue_doc_id: $venue_doc_id
      venue_share_pct: $venue_share_pct
      venue_commission_pct: $venue_commission_pct
    ) {
      id
    }
  }
`;

export const SET_VENUE_ACTIVE = gql`
  mutation VenueEditorActive($venue_doc_id: ID!, $active: Boolean!) {
    setVenueActive(venue_doc_id: $venue_doc_id, active: $active) {
      id
      is_active
    }
  }
`;

export interface VenueRegistrationConfig {
  venue_types: string[];
  doc_types: string[];
  capacity_item_limit: number;
  amenities: string[];
  facilities: string[];
  security: string[];
}

export interface OwnerCandidate {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}
