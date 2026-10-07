import { gql } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';

/** Just the part of a venue this page reads — the picker and the policy. */
export interface VenueSettingsVenue {
  id: string;
  venue_name: string;
  status: string;
  settings: { cancellation: VenueCancellationPolicy };
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
      settings {
        ${CANCELLATION_FIELDS}
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
