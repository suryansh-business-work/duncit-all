import { gql, type TypedDocumentNode } from '@apollo/client';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';
import type { SwitchableVenue } from '@duncit/utils';

/** One `myVenues` row as this page reads it — the switcher's fields, the policy and the Pod Request cap. */
export interface SettingsVenue extends SwitchableVenue {
  id: string;
  settings?: {
    cancellation?: VenueCancellationPolicy | null;
    rules?: { max_host_requests_per_month: number } | null;
  } | null;
  /** Duncit's cap on this venue's Pod Requests; wins over the owner's own. */
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

/** The owner's venues, each with the cancellation policy and the Pod Request cap this page edits. */
export const MY_VENUES_CANCELLATION = gql`
  query MyVenuesCancellation {
    myVenues {
      id
      venue_name
      status
      city
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

/** Only `rules.max_host_requests_per_month` is sent, so the other rules stay as they are. The card
 * re-reads the venues afterwards rather than splicing a partial `settings` into the cache. */
export const UPDATE_VENUE_HOST_REQUEST_LIMIT: TypedDocumentNode<
  { updateVenueSettings: { id: string } },
  { venue_doc_id: string; input: { rules: { max_host_requests_per_month: number } } }
> = gql`
  mutation UpdateVenueHostRequestLimit($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
    }
  }
`;
