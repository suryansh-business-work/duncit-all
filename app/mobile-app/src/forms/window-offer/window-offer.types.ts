import { z } from 'zod';
import { isVenueOfferModel, offerRateOf, venueOfferInput } from '@duncit/utils';

import type { VenueOfferModel } from '@/generated/graphql/graphql';
import type { Translate } from '@/i18n/fallback';

/**
 * A time window and price terms put forward to a venue — or by one: a Pod
 * Request's proposal, a venue accepting an Auto Pod, a venue taking over a
 * pod. The window comes from the venue's own calendar; the server prices it.
 */
export interface WindowOfferValues {
  /** The window (ISO), '' until picked. */
  start: string;
  end: string;
  /** How the venue is paid (a VenueOfferModel), '' until picked. */
  model: string;
  /** The amount typed for that option, in rupees. */
  rate: string;
  /** Guests, as typed — asked only where the flow does not already know them. */
  guests: string;
}

/** A complete window offer, in the shape every venue-offer input takes. */
export interface WindowOffer {
  start_at: string;
  end_at: string;
  space_label: string;
  model: VenueOfferModel;
  rate: number;
  pax: number;
}

export const windowOfferDefaults = (guests = 0): WindowOfferValues => ({
  start: '',
  end: '',
  model: '',
  rate: '',
  guests: guests > 0 ? String(guests) : '',
});

const guestsOf = (text: string) => {
  const guests = Number(text);
  return Number.isInteger(guests) ? guests : 0;
};

/** The offer's rules, in the viewer's language; `askGuests` adds the guests line. */
export const makeWindowOfferSchema = (t: Translate, askGuests: boolean) =>
  z.object({
    start: z.string().min(1, t('mweb.hostPodActions.slotRequired')),
    end: z.string().min(1, t('mweb.hostPodActions.slotRequired')),
    model: z.string().refine(isVenueOfferModel, t('mweb.hostPodActions.offerModelRequired')),
    rate: z
      .string()
      .refine((rate) => offerRateOf(rate) > 0, t('mweb.hostPodActions.offerRateRequired')),
    guests: z
      .string()
      .refine((text) => !askGuests || guestsOf(text) >= 1, t('windowOffer.guestsInvalid')),
  });

/** The offer the values hold, or null until it is complete. */
export function windowOfferOf(values: WindowOfferValues): WindowOffer | null {
  const offer = venueOfferInput({
    start: values.start || null,
    end: values.end || null,
    pax: guestsOf(values.guests),
    pets: false,
    spaceLabel: '',
    model: values.model,
    rate: values.rate,
  });
  if (!offer) return null;
  return {
    start_at: offer.start_at,
    end_at: offer.end_at,
    space_label: offer.space_label,
    // The app's generated enum carries the same four values the shared union does.
    model: offer.model as VenueOfferModel,
    rate: offer.rate,
    pax: offer.pax,
  };
}

/** The window and terms alone — for the inputs that take the guests from the pod itself. */
export function windowTermsOf(offer: WindowOffer) {
  return {
    start_at: offer.start_at,
    end_at: offer.end_at,
    space_label: offer.space_label,
    model: offer.model,
    rate: offer.rate,
  };
}
