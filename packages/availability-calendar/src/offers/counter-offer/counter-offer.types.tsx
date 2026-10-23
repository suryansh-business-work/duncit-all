import type { VenueOfferCounterValues } from '@duncit/forms/schemas';
import type { CounterTerms } from '../useCounterQuote';

export type CounterOfferValues = VenueOfferCounterValues;

/** The terms the server prices and the mutation carries, or null until the amount is usable. */
export function counterTermsOf(values: Readonly<Pick<CounterOfferValues, 'model' | 'rate'>>): CounterTerms | null {
  const rate = Number(String(values.rate).trim());
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { model: values.model, rate };
}
