import { gql } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';
import type { SwitchableVenue } from '@duncit/utils';

/** One `myVenues` row as this page reads it — the switcher's fields and the policy. */
export interface SettingsVenue extends SwitchableVenue {
  id: string;
  settings?: { cancellation?: VenueCancellationPolicy | null } | null;
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

/** The owner's venues, each with the cancellation policy this page edits. */
export const MY_VENUES_CANCELLATION = gql`
  query MyVenuesCancellation {
    myVenues {
      id
      venue_name
      status
      city
      settings {
        ${CANCELLATION_FIELDS}
      }
    }
  }
`;

/**
 * `updateVenueSettings` merges the keys it is given, so sending only
 * `cancellation` leaves the operating hours and auto-extend rules alone.
 */
export const UPDATE_VENUE_CANCELLATION_POLICY = gql`
  mutation UpdateVenueCancellationPolicy($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      settings {
        ${CANCELLATION_FIELDS}
      }
    }
  }
`;
