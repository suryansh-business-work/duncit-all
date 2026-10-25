import type { VenueOfferTerms } from '@duncit/forms/schemas';

import { offerTermsInput } from '@/components/venue-offer/offer-terms-input';
import {
  ApproveVenueSlotRequestDocument,
  CounterVenueOfferDocument,
  DeclineVenueSlotRequestDocument,
} from '@/graphql/venue-slot-requests';
import { roundOf, useOfferAnswer, type OfferAnswerState } from '@/hooks/useOfferAnswer';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * The venue's three answers to a host's booking offer, each sent for the round
 * it read (`round` null: a request from before offers). Each resolves true when
 * the sheet that asked for it should close.
 */
export interface VenueOfferAnswers extends OfferAnswerState {
  accept: (slotId: string, round: number | null) => Promise<boolean>;
  reject: (slotId: string, reason: string, round: number | null) => Promise<boolean>;
  counter: (
    slotId: string,
    terms: VenueOfferTerms,
    note: string,
    round: number | null,
  ) => Promise<boolean>;
}

/**
 * Accept, reject or counter a booking as its venue — from the booking-requests
 * inbox and from the pod's venue chat alike. `reread` refreshes whatever shows
 * the offer once an answer is made (or refused because the host moved first).
 */
export function useVenueOfferAnswers(reread: () => Promise<unknown>): VenueOfferAnswers {
  const { t } = useTranslation();
  const { run, ...state } = useOfferAnswer(reread, 'useVenueOfferAnswers');

  return {
    ...state,
    accept: (slotId, round) =>
      run(
        () =>
          graphqlRequest(
            ApproveVenueSlotRequestDocument,
            { slot_id: slotId, ...roundOf(round) },
            { auth: true },
          ),
        t('availability.offers.done.accepted'),
      ),
    reject: (slotId, reason, round) =>
      run(
        () =>
          graphqlRequest(
            DeclineVenueSlotRequestDocument,
            { slot_id: slotId, reason: reason || null, ...roundOf(round) },
            { auth: true },
          ),
        t('availability.offers.done.rejected'),
      ),
    counter: (slotId, terms, note, round) =>
      run(
        () =>
          graphqlRequest(
            CounterVenueOfferDocument,
            {
              slot_id: slotId,
              terms: offerTermsInput(terms),
              note: note || null,
              ...roundOf(round),
            },
            { auth: true },
          ),
        t('availability.offers.done.countered'),
      ),
  };
}
