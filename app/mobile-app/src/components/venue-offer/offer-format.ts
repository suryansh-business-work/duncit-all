import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  formatMoney,
  freeReasonKey,
  isFreeVenueOfferModel,
  moneyRangeText,
  venueOfferTermsLine,
} from '@duncit/utils';

import type {
  CounterQuoteResultFragment,
  VenueOfferTermsFragment,
  VenueQuoteFieldsFragment,
} from '@/graphql/venue-offer';
import type { Translate } from '@/i18n/fallback';

/** A booking offer's terms as both sides read them (`MobileVenueOfferTerms`). */
export type OfferTerms = ResultOf<typeof VenueOfferTermsFragment>;
/** The server's price of one side's terms (`MobileVenueQuoteFields`). */
export type OfferQuote = ResultOf<typeof VenueQuoteFieldsFragment>;
/** A counter priced before it is sent, at both ends of the guests. */
export type CounterQuoteResult = ResultOf<typeof CounterQuoteResultFragment>;
/** Which side of a booking offer reads or answers it. */
export type OfferSide = 'HOST' | 'VENUE';

/** Rupees as the offer surfaces print them ("₹3,000"). */
export const offerMoney = (rupees: number): string => formatMoney(rupees);

/** "₹3,000" or "₹3,000 – ₹10,000" — one amount when both ends of the guests cost the same. */
export const offerMoneyRange = (min: number, max: number): string =>
  moneyRangeText(min, max, offerMoney);

/** "Per guest · ₹300 per guest", "Free venue"; just the amount for an option this build does not know. */
export function offerTermsText(t: Translate, model: string, rate: number): string {
  return venueOfferTermsLine(t, model, offerMoney(rate));
}

/** One negotiation step's terms, with the fewest guests it named — '' for a step that named none. */
export function offerStepTerms(
  t: Translate,
  step: Readonly<{ model?: string | null; rate?: number | null; min_guests?: number | null }>,
): string {
  // A free venue names no amount, and is still the terms of that step.
  if (!step.model || (!step.rate && !isFreeVenueOfferModel(step.model))) return '';
  const terms = offerTermsText(t, step.model, step.rate ?? 0);
  if (!step.min_guests) return terms;
  const fewest = t('availability.offers.history.minGuests', { vars: { n: step.min_guests } });
  return `${terms} · ${fewest}`;
}

/**
 * What a free arrangement reads in place of the money, for the side reading
 * it: a free pod's host settles the venue directly (both sides are told so); a
 * free venue is paid nothing — its host is told it still answers, the venue
 * reads the host's reason instead (`freeReasonNote`), so '' for it. null when
 * the terms are priced and the money shows.
 */
export function freeMoneyLine(
  t: Translate,
  side: OfferSide,
  podIsFree: boolean,
  model: string | null | undefined,
): string | null {
  if (podIsFree) {
    return side === 'HOST'
      ? t('availability.offers.hostAnswer.freePod')
      : t('availability.offers.freePod');
  }
  if (!isFreeVenueOfferModel(model)) return null;
  return side === 'HOST' ? t('mweb.createPod.offer.freeQuote') : '';
}

/**
 * "Requested free — Promotional offer: launch week" — why the host asked the
 * venue for the window for free, as the venue reads it beside the request; ''
 * when the offer names no reason this build knows.
 */
export function freeReasonNote(
  t: Translate,
  justification: Readonly<{ reason: string; details?: string | null }> | null | undefined,
): string {
  const key = freeReasonKey(justification?.reason);
  if (!key) return '';
  const reason = t(key);
  const details = justification?.details?.trim();
  return details
    ? t('availability.freeArrangement.venueNoteDetails', { vars: { reason, details } })
    : t('availability.freeArrangement.venueNote', { vars: { reason } });
}
