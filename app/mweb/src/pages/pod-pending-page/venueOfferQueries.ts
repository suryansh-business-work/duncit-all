import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationAcceptVenueCounterOfferArgs,
  MutationRejectVenueCounterOfferArgs,
  QueryPodVenueOfferArgs,
} from '@duncit/gql-types';
import {
  ACCEPT_VENUE_COUNTER_OFFER_SDL,
  POD_VENUE_OFFER_SDL,
  REJECT_VENUE_COUNTER_OFFER_SDL,
  type VenueQuote,
} from '@duncit/utils';

/** A pod's venue offer as the pending page reads it (POD_VENUE_OFFER_SDL). */
export interface PodVenueOffer {
  slot_id: string;
  start_at: string;
  end_at: string;
  space_label: string;
  model: string;
  rate: number;
  pax: number;
  status: string;
  awaiting: string | null;
  quote: VenueQuote;
  counter: { model: string; rate: number; note: string; quote: VenueQuote } | null;
}

/** The pod's offer to its venue — null for a pod that has none. Native twin: graphql/venue-offer. */
export const POD_VENUE_OFFER: TypedDocumentNode<{ podVenueOffer: PodVenueOffer | null }, QueryPodVenueOfferArgs> =
  gql(POD_VENUE_OFFER_SDL);

/** The host takes the venue's counter: the booking is confirmed and the pod goes live. */
export const ACCEPT_VENUE_COUNTER_OFFER: TypedDocumentNode<
  { acceptVenueCounterOffer: PodVenueOffer },
  MutationAcceptVenueCounterOfferArgs
> = gql(ACCEPT_VENUE_COUNTER_OFFER_SDL);

/** The host turns the venue's counter down: the hold is released and the pod is venue-declined. */
export const REJECT_VENUE_COUNTER_OFFER: TypedDocumentNode<
  { rejectVenueCounterOffer: boolean },
  MutationRejectVenueCounterOfferArgs
> = gql(REJECT_VENUE_COUNTER_OFFER_SDL);
