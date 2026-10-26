import type { VenueOfferTerms } from '@duncit/forms/schemas';
import { isVenueOfferModel } from '@duncit/utils';

import { VenueOfferModel, type VenueOfferTermsInput } from '@/generated/graphql/graphql';

/** The shared form's pricing option as the codegen's enum — the same three values, mapped not cast. */
const MODEL_ENUM: Readonly<Record<VenueOfferTerms['model'], VenueOfferModel>> = {
  PER_GUEST: VenueOfferModel.PerGuest,
  PER_HOUR: VenueOfferModel.PerHour,
  FLAT: VenueOfferModel.Flat,
};

/** A pricing option typed as plain text (a form row) as the codegen's enum, or null for one this build does not know. */
export const offerModelEnum = (model: string | null | undefined): VenueOfferModel | null =>
  isVenueOfferModel(model) ? MODEL_ENUM[model] : null;

/**
 * What a counter is priced on — the option, the amount and any minimum, never
 * the points, the note or the photos: changing those must not ask for a new price.
 */
export function offerPriceTermsInput(terms: Readonly<VenueOfferTerms>): VenueOfferTermsInput {
  const priced: VenueOfferTermsInput = { model: MODEL_ENUM[terms.model], rate: terms.rate };
  return terms.min_guests === undefined ? priced : { ...priced, min_guests: terms.min_guests };
}

/** A counter as it is sent (`VenueOfferTermsInput`): the price terms, the points and any photos. */
export function offerTermsInput(terms: Readonly<VenueOfferTerms>): VenueOfferTermsInput {
  const input: VenueOfferTermsInput = {
    ...offerPriceTermsInput(terms),
    offerings: terms.offerings,
  };
  return terms.images?.length ? { ...input, images: terms.images } : input;
}
