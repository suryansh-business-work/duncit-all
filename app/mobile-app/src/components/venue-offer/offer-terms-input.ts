import type { VenueOfferTerms } from '@duncit/forms/schemas';
import {
  freeJustificationInput,
  isHostOfferModel,
  isVenueOfferModel,
  type FreeJustificationInput as SharedFreeJustification,
  type FreeJustificationSource,
  type FreeReason,
  type HostOfferModel,
  type VenueOfferInput as SharedOfferInput,
} from '@duncit/utils';

import {
  FreeArrangementReason,
  VenueOfferModel,
  type FreeJustificationInput,
  type VenueOfferInput,
  type VenueOfferTermsInput,
} from '@/generated/graphql/graphql';

/** The shared form's pricing option as the codegen's enum — the same three values, mapped not cast. */
const MODEL_ENUM: Readonly<Record<VenueOfferTerms['model'], VenueOfferModel>> = {
  PER_GUEST: VenueOfferModel.PerGuest,
  PER_HOUR: VenueOfferModel.PerHour,
  FLAT: VenueOfferModel.Flat,
};

/** A host's opening-offer option — the three pricing options, then a free venue — as the codegen's enum. */
const HOST_MODEL_ENUM: Readonly<Record<HostOfferModel, VenueOfferModel>> = {
  ...MODEL_ENUM,
  FREE: VenueOfferModel.Free,
};

/** Why something is free (`FREE_REASONS`) as the codegen's enum. */
const REASON_ENUM: Readonly<Record<FreeReason, FreeArrangementReason>> = {
  INITIATIVE: FreeArrangementReason.Initiative,
  PROMOTIONAL: FreeArrangementReason.Promotional,
  CAMPAIGN: FreeArrangementReason.Campaign,
  OTHER: FreeArrangementReason.Other,
};

/** A pricing option typed as plain text (a form row) as the codegen's enum, or null for one this build does not know. */
export const offerModelEnum = (model: string | null | undefined): VenueOfferModel | null =>
  isVenueOfferModel(model) ? MODEL_ENUM[model] : null;

/** An opening-offer option (priced, or FREE) as the codegen's enum, or null for one this build does not know. */
export const hostOfferModelEnum = (model: string | null | undefined): VenueOfferModel | null =>
  isHostOfferModel(model) ? HOST_MODEL_ENUM[model] : null;

const toAppJustification = (
  justification: Readonly<SharedFreeJustification>,
): FreeJustificationInput => ({
  reason: REASON_ENUM[justification.reason],
  details: justification.details,
  accepted: justification.accepted,
});

/**
 * A free justification as the server takes it (`FreeJustificationInput`), or
 * null until the form holds a complete, accepted one (`freeJustificationInput`).
 */
export function appFreeJustification(
  source: Readonly<FreeJustificationSource>,
): FreeJustificationInput | null {
  const justification = freeJustificationInput(source);
  return justification ? toAppJustification(justification) : null;
}

/**
 * A host's opening offer (`venueOfferInput`) as the codegen's input — the
 * option and any free reason mapped onto the enums, not cast. Create Pod and
 * the resubmit sheet both send it.
 */
export function hostOfferInput(offer: Readonly<SharedOfferInput>): VenueOfferInput {
  const { model, free_justification: justification, ...rest } = offer;
  const input: VenueOfferInput = { ...rest, model: HOST_MODEL_ENUM[model] };
  return justification
    ? { ...input, free_justification: toAppJustification(justification) }
    : input;
}

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
