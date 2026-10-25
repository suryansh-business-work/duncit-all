import { venueOfferTermsOf, type VenueOfferCounterValues, type VenueOfferTerms } from '@duncit/forms/schemas';
import type { CounterTerms } from '../useCounterQuote';

export type CounterOfferValues = VenueOfferCounterValues;

/** Only a per-guest price is paid for a minimum of guests; any other option sends none. */
export const asksMinGuests = (model: string): boolean => model === 'PER_GUEST';

/**
 * The terms a counter sends (`VenueOfferTermsInput`), or null until the amount
 * and any minimum are usable. The minimum goes only with a per-guest price —
 * left out, the minimum on the table stands.
 */
export function counterTermsOf(
  values: Readonly<Pick<CounterOfferValues, 'model' | 'rate' | 'min_guests' | 'offerings'>>,
): VenueOfferTerms | null {
  return venueOfferTermsOf({ ...values, min_guests: asksMinGuests(values.model) ? values.min_guests : '' });
}

/**
 * What the live quote is asked with: the counter's price terms, never its
 * points or note — typing those must not ask for a new price.
 */
export function counterQuoteTermsOf(values: Readonly<Pick<CounterOfferValues, 'model' | 'rate' | 'min_guests'>>): CounterTerms | null {
  const terms = counterTermsOf({ ...values, offerings: '' });
  if (!terms) return null;
  const priced: CounterTerms = { model: terms.model, rate: terms.rate };
  return terms.min_guests === undefined ? priced : { ...priced, min_guests: terms.min_guests };
}
