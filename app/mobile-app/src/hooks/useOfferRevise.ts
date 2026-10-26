import type { VenueOfferTerms } from '@duncit/forms/schemas';

import { offerTermsInput } from '@/components/venue-offer/offer-terms-input';
import {
  EditVenueOfferCounterDocument,
  WithdrawVenueOfferCounterDocument,
} from '@/graphql/venue-offer';
import { useOfferAnswer, type OfferAnswerState } from '@/hooks/useOfferAnswer';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';

/** Changing or taking back one's own latest counter, each for the round it read. */
export interface OfferReviseAnswers extends OfferAnswerState {
  edit: (terms: VenueOfferTerms, note: string, round: number) => Promise<boolean>;
  withdraw: (round: number) => Promise<boolean>;
}

/**
 * Either side's second thoughts on its own latest counter, from the pod's
 * venue chat, while the other side has not seen it yet: edit it (priced again,
 * its note and photos kept as the sheet shows them) or withdraw it (the terms
 * before it are back on the table). The server refuses once it has been seen
 * (OFFER_SEEN — its reason stays in the sheet) and when the terms moved first
 * (OFFER_CHANGED — said, then re-read). Each resolves true when its sheet closes.
 */
export function useOfferRevise(podId: string, reread: () => Promise<unknown>): OfferReviseAnswers {
  const { t } = useTranslation();
  const { run, ...state } = useOfferAnswer(reread, 'useOfferRevise');

  return {
    ...state,
    edit: (terms, note, round) =>
      run(
        () =>
          graphqlRequest(
            EditVenueOfferCounterDocument,
            { pod_id: podId, terms: offerTermsInput(terms), note: note || null, round },
            { auth: true },
          ),
        t('availability.offers.revise.edited'),
      ),
    withdraw: (round) =>
      run(
        () =>
          graphqlRequest(
            WithdrawVenueOfferCounterDocument,
            { pod_id: podId, round },
            { auth: true },
          ),
        t('availability.offers.revise.withdrawn'),
      ),
  };
}
