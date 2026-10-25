import type { ResultOf } from '@graphql-typed-document-node/core';
import { formatMoney, moneyRangeText, venueOfferInboxModelKey } from '@duncit/utils';

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

/** "Per guest · ₹300 per guest"; just the amount for an option this build does not know. */
export function offerTermsText(t: Translate, model: string, rate: number): string {
  const amount = offerMoney(rate);
  const keys = venueOfferInboxModelKey(model);
  if (!keys) return amount;
  return t('availability.offers.termsLine', {
    vars: { model: t(keys.label), rate: t(keys.rate, { vars: { rate: amount } }) },
  });
}

/** One negotiation step's terms, with the fewest guests it named — '' for a step that named none. */
export function offerStepTerms(
  t: Translate,
  step: Readonly<{ model?: string | null; rate?: number | null; min_guests?: number | null }>,
): string {
  if (!step.model || !step.rate) return '';
  const terms = offerTermsText(t, step.model, step.rate);
  if (!step.min_guests) return terms;
  const fewest = t('availability.offers.history.minGuests', { vars: { n: step.min_guests } });
  return `${terms} · ${fewest}`;
}
