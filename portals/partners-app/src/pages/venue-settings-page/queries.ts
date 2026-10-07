import { gql } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';

/** Just the part of a venue this page reads — the picker and the policy. */
export interface VenueSettingsVenue {
  id: string;
  venue_name: string;
  status: string;
  settings: { cancellation: VenueCancellationPolicy; rules: { max_host_requests_per_month: number } };
  /** Set by Duncit; wins over the owner's own monthly cap. */
  host_requests_limit_override?: number | null;
}

const CANCELLATION_FIELDS = `
  cancellation {
    reschedule_only
    tiers {
      hours_before
      charge_type
      value
    }
  }
`;

/** The owner's venues, each with the policy this page edits. */
export const MY_VENUES_SETTINGS = gql`
  query MyVenuesSettings {
    myVenues {
      id
      venue_name
      status
      host_requests_limit_override
      settings {
        ${CANCELLATION_FIELDS}
        rules {
          max_host_requests_per_month
        }
      }
    }
  }
`;

/**
 * The same mutation Operating Hours and Auto-extend save through — it merges
 * the keys it is given, so sending only `cancellation` leaves the rest alone.
 */
export const UPDATE_VENUE_CANCELLATION = gql`
  mutation UpdateVenueCancellation($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      settings {
        ${CANCELLATION_FIELDS}
      }
    }
  }
`;

/** Venue Settings' "Maximum Host Requests / Month" — the same settings mutation, rules only. */
export const UPDATE_VENUE_REQUEST_LIMIT = gql`
  mutation UpdateVenueRequestLimit($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      settings {
        rules {
          max_host_requests_per_month
        }
      }
    }
  }
`;
