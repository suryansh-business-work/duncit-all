import { gql } from '@apollo/client';
import { BREAKDOWN_FIELDS } from '../../pricing/queries';
import type { PriceBreakdown } from '../../pricing/types';
import type { WindowQuoteSource } from '../window-offer/useWindowQuote';

/** The proposed window's terms on a Pod Request's slot (`PartnerRequestSlot.offer`). */
export const POD_REQUEST_OFFER_FIELDS = `offer { model rate pax quote { ${BREAKDOWN_FIELDS} } }`;

export interface PodRequestProposedOffer {
  model: string;
  rate: number;
  pax: number;
  quote: PriceBreakdown;
}

export const POD_PARTNER_WINDOW_QUOTE = gql`
  query PodPartnerWindowQuote($id: ID!, $offer: VenueOfferInput!) {
    podPartnerWindowQuote(id: $id, offer: $offer) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
    }
  }
`;

export const PROPOSE_POD_PARTNER_WINDOW = gql`
  mutation ProposePodPartnerWindow($id: ID!, $offer: VenueOfferInput!) {
    proposePodPartnerWindow(id: $id, offer: $offer) {
      id
      status
    }
  }
`;

/** How a Pod Request prices the window being proposed. */
export const podRequestQuoteSource = (id: string): WindowQuoteSource => ({
  document: POD_PARTNER_WINDOW_QUOTE,
  field: 'podPartnerWindowQuote',
  variables: (offer) => ({ id, offer }),
});
