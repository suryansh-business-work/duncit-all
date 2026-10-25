import type { VenueOfferCounterValues } from '@duncit/forms/schemas';

export type CounterOfferValues = VenueOfferCounterValues;

/**
 * The minimum travels only with a per-guest price — left out, the minimum on
 * the table stands. One rule with the web counter (@duncit/forms).
 */
export {
  counterAsksMinGuests as asksMinGuests,
  venueOfferCounterTermsOf as counterTermsOf,
} from '@duncit/forms/schemas';
