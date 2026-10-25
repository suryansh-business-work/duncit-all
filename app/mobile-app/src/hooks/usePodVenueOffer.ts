import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import type { VenueOfferTerms } from '@duncit/forms/schemas';

import type { OfferTerms } from '@/components/venue-offer/offer-format';
import { offerTermsInput } from '@/components/venue-offer/offer-terms-input';
import {
  AcceptVenueCounterOfferDocument,
  CounterVenueOfferAsHostDocument,
  PodVenueOfferDocument,
  RejectVenueCounterOfferDocument,
} from '@/graphql/venue-offer';
import { useOfferAnswer, type OfferAnswerState } from '@/hooks/useOfferAnswer';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

export type PodVenueOffer = OfferTerms;

/** The host's three answers to the venue's counter, each sent for the round they read. */
export interface HostOfferAnswers extends OfferAnswerState {
  accept: (round: number) => Promise<boolean>;
  reject: (reason: string, round: number) => Promise<boolean>;
  counter: (terms: VenueOfferTerms, note: string, round: number) => Promise<boolean>;
}

/**
 * A pod's live offer to its venue (`podVenueOffer`) — its host's pending screen
 * and both sides of the venue chat read it; null for a pod without one, and
 * once an offer is declined or ran out. `refresh` re-reads it; `host` holds the
 * host's answers to a venue counter — accept (the booking is confirmed), reject
 * (the hold is released) or counter back — each re-reading the offer, then
 * `onAnswered`. mWeb twin: @duncit/availability-calendar usePodVenueOffer +
 * HostOfferActions' mutations.
 */
export function usePodVenueOffer(podId: string, onAnswered?: () => unknown) {
  const { t } = useTranslation();
  const [offer, setOffer] = useState<PodVenueOffer | null>(null);

  const refresh = useCallback(async () => {
    if (!podId) return;
    try {
      const res = await graphqlRequest(PodVenueOfferDocument, { pod_id: podId }, { auth: true });
      setOffer(res.podVenueOffer ?? null);
    } catch (err: unknown) {
      // The card keeps what it showed; the next refresh tries again.
      logs.mobileApp.warn('usePodVenueOffer', 'load', { error: err, pod_id: podId });
    }
  }, [podId]);

  useEffect(() => {
    fireAndForget(refresh());
  }, [refresh]);

  const reread = useCallback(async () => {
    await refresh();
    await onAnswered?.();
  }, [refresh, onAnswered]);
  const { run, ...state } = useOfferAnswer(reread, 'usePodVenueOffer');

  const host: HostOfferAnswers = {
    ...state,
    accept: (round) =>
      run(
        () =>
          graphqlRequest(AcceptVenueCounterOfferDocument, { pod_id: podId, round }, { auth: true }),
        t('availability.offers.hostAnswer.accepted'),
      ),
    reject: (reason, round) =>
      run(
        () =>
          graphqlRequest(
            RejectVenueCounterOfferDocument,
            { pod_id: podId, reason: reason || null, round },
            { auth: true },
          ),
        t('availability.offers.hostAnswer.rejected'),
      ),
    counter: (terms, note, round) =>
      run(
        () =>
          graphqlRequest(
            CounterVenueOfferAsHostDocument,
            { pod_id: podId, terms: offerTermsInput(terms), note: note || null, round },
            { auth: true },
          ),
        t('availability.offers.hostAnswer.countered'),
      ),
  };

  return { offer, refresh, host };
}
