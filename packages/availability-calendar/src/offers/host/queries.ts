import { gql } from '@apollo/client';
import {
  ACCEPT_VENUE_COUNTER_OFFER_SDL,
  COUNTER_VENUE_OFFER_AS_HOST_SDL,
  REJECT_VENUE_COUNTER_OFFER_SDL,
} from '@duncit/utils';
import { BREAKDOWN_FIELDS } from '../../pricing/queries';
import { OFFER_TERMS_FIELDS, type OfferTerms } from '../queries';

/**
 * A pod's live venue offer — for its hosts and the venue's owner alike — with
 * the window it books. Null once the offer is declined or ran out (the hold is
 * released). Priced with this package's breakdown, so the same price card reads it.
 */
export const POD_VENUE_OFFER_TERMS = gql`
  query PodVenueOfferTerms($pod_id: ID!) {
    podVenueOffer(pod_id: $pod_id) {
      ${OFFER_TERMS_FIELDS}
      pod_id
      start_at
      end_at
    }
  }
`;

/** `POD_VENUE_OFFER_TERMS`'s offer. */
export interface PodOffer extends OfferTerms {
  pod_id: string | null;
  start_at: string;
  end_at: string;
}

/** The host takes the venue's counter for the round they read: the booking is confirmed. */
export const ACCEPT_VENUE_COUNTER = gql(ACCEPT_VENUE_COUNTER_OFFER_SDL);

/** The host turns the venue's counter down for the round they read: the hold is released. */
export const REJECT_VENUE_COUNTER = gql(REJECT_VENUE_COUNTER_OFFER_SDL);

/** The host answers the venue's counter with terms of their own; the venue answers next. */
export const COUNTER_AS_HOST = gql(COUNTER_VENUE_OFFER_AS_HOST_SDL);

/** The host's counter-back priced before it is sent, at the most and the fewest guests. */
export const HOST_COUNTER_OFFER_QUOTE = gql`
  query HostCounterOfferQuote($pod_id: ID!, $terms: VenueOfferTermsInput!) {
    hostCounterQuote(pod_id: $pod_id, terms: $terms) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
      quote_min { ${BREAKDOWN_FIELDS} }
    }
  }
`;
