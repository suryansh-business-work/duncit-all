import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { venueOfferPriceInput, type VenueOfferInput } from '@duncit/utils';
import { venueOfferOf } from './create-pod.payload';
import type { CreatePodForm } from './create-pod.types';
import { VENUE_OFFER_QUOTE } from './venueOffer';

const QUOTE_DEBOUNCE_MS = 300;

/**
 * The offer the form holds as the live quote asks for it — everything that
 * moves the price, none of the points or the note, so typing those never asks
 * for a new price — or null (virtual, a held slot, or not complete yet).
 */
export function offerOfForm(form: CreatePodForm): VenueOfferInput | null {
  form.watch(['pod_date_time', 'pod_end_date_time', 'no_of_spots', 'venue_booking_pets', 'venue_space_label', 'venue_offer_model', 'venue_offer_rate']);
  const values = form.getValues();
  if (values.pod_mode !== 'PHYSICAL' || values.venue_slot_id) return null;
  const offer = venueOfferOf(values);
  return offer ? venueOfferPriceInput(offer) : null;
}

/**
 * The server's price for the host's offer (`venueOfferQuote`): the offered
 * rate with the venue's price rules, fees, minimum spend and GST, and Duncit's
 * commission on top, at the pod's spots (`quote`) and at the venue's minimum
 * guests (`quoteMin`) — or, when the offer cannot be sent, why (`message`).
 * Debounced so typing an amount or stepping guests does not fire a request per
 * key. Step 3 shows it; the stepper feeds it into the earnings preview, so both
 * read one cached answer. Native twin: useOfferQuote.
 */
export function useOfferQuote(form: CreatePodForm) {
  const venueId = form.watch('venue_id');
  const offer = offerOfForm(form);
  const key = venueId && offer ? JSON.stringify(offer) : '';
  const [sent, setSent] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setSent(key), QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key]);
  const sentOffer: VenueOfferInput | null = sent ? JSON.parse(sent) : null;
  const { data, loading, error } = useQuery(VENUE_OFFER_QUOTE, {
    variables: { venue_id: venueId, offer: sentOffer ?? { start_at: '', end_at: '', model: 'FLAT', rate: 0 } },
    skip: !sentOffer,
    fetchPolicy: 'cache-first',
  });
  const settled = sent === key && Boolean(key);
  const answer = settled && !error ? data?.venueOfferQuote : undefined;
  const quote = answer?.ok ? (answer.quote ?? null) : null;
  return {
    /** Null while nothing complete is offered, the request is in flight, it failed, or the offer cannot be sent. */
    quote,
    /** The same offer priced at the venue's minimum guests; the quote itself when the server prices no minimum. */
    quoteMin: quote ? (answer?.quote_min ?? quote) : null,
    /** Why the offer cannot be sent, when the server says so. */
    message: answer && !answer.ok ? (answer.message ?? null) : null,
    loading: Boolean(key) && (!settled || loading),
    error: settled ? (error ?? null) : null,
  };
}
