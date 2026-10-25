import type { VenueOfferTerms } from '@duncit/forms/schemas';

import { VenueOfferModel, type VenueOfferTermsInput } from '@/generated/graphql/graphql';

/** The shared form's pricing option as the codegen's enum — the same four values, mapped not cast. */
const MODEL_ENUM: Readonly<Record<VenueOfferTerms['model'], VenueOfferModel>> = {
  PER_GUEST: VenueOfferModel.PerGuest,
  PER_HOUR: VenueOfferModel.PerHour,
  PER_SLOT: VenueOfferModel.PerSlot,
  FLAT: VenueOfferModel.Flat,
};

/**
 * What a counter is priced on — the option, the amount and any minimum, never
 * the points (or the note): typing those must not ask for a new price.
 */
export function offerPriceTermsInput(terms: Readonly<VenueOfferTerms>): VenueOfferTermsInput {
  const priced: VenueOfferTermsInput = { model: MODEL_ENUM[terms.model], rate: terms.rate };
  return terms.min_guests === undefined ? priced : { ...priced, min_guests: terms.min_guests };
}

/** A counter as it is sent (`VenueOfferTermsInput`): the price terms and the points. */
export const offerTermsInput = (terms: Readonly<VenueOfferTerms>): VenueOfferTermsInput => ({
  ...offerPriceTermsInput(terms),
  offerings: terms.offerings,
});
