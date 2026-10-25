import { venueOfferCounterTermsOf, type VenueOfferCounterValues } from '@duncit/forms/schemas';
import type { CounterTerms } from '../useCounterQuote';

export type CounterOfferValues = VenueOfferCounterValues;

/** The minimum goes only with a per-guest price; the rule is shared with the native app (@duncit/forms). */
export {
  counterAsksMinGuests as asksMinGuests,
  venueOfferCounterTermsOf as counterTermsOf,
} from '@duncit/forms/schemas';

/**
 * What the live quote is asked with: the counter's price terms, never its
 * points or note — typing those must not ask for a new price.
 */
export function counterQuoteTermsOf(values: Readonly<Pick<CounterOfferValues, 'model' | 'rate' | 'min_guests'>>): CounterTerms | null {
  const terms = venueOfferCounterTermsOf({ ...values, offerings: '' });
  if (!terms) return null;
  const priced: CounterTerms = { model: terms.model, rate: terms.rate };
  return terms.min_guests === undefined ? priced : { ...priced, min_guests: terms.min_guests };
}
