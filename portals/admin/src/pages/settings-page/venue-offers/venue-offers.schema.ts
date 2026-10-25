import { z } from 'zod';
import type { VenueOfferDefaults, VenueOfferDefaultsValues } from './venue-offers.types';

/** The server's bounds on the two platform defaults (UpdateAppSettingsInput). */
export const VENUE_OFFER_DEFAULT_LIMITS = {
  minGuests: { min: 1, max: 1000 },
  responseHours: { min: 1, max: 720 },
} as const;

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

const wholeIn = (bounds: { min: number; max: number }) => (raw: string) => {
  const n = Number(raw);
  return raw !== '' && Number.isInteger(n) && n >= bounds.min && n <= bounds.max;
};

/** Both defaults are required whole numbers — a venue that set 0 falls back to them. */
export const makeVenueOffersSchema = (t: Translate) => {
  const { minGuests, responseHours } = VENUE_OFFER_DEFAULT_LIMITS;
  return z.object({
    venue_offer_min_guests_default: z
      .string()
      .trim()
      .refine(wholeIn(minGuests), { message: t('admin.venueOfferSettings.minGuestsInvalid', { vars: minGuests }) }),
    venue_offer_response_hours_default: z
      .string()
      .trim()
      .refine(wholeIn(responseHours), {
        message: t('admin.venueOfferSettings.responseHoursInvalid', { vars: responseHours }),
      }),
  });
};

export const toVenueOffersValues = (settings: VenueOfferDefaults): VenueOfferDefaultsValues => ({
  venue_offer_min_guests_default: String(settings.venue_offer_min_guests_default),
  venue_offer_response_hours_default: String(settings.venue_offer_response_hours_default),
});

/** The validated values as the `UpdateAppSettingsInput` fields. */
export const toVenueOffersInput = (values: VenueOfferDefaultsValues): VenueOfferDefaults => ({
  venue_offer_min_guests_default: Number(values.venue_offer_min_guests_default),
  venue_offer_response_hours_default: Number(values.venue_offer_response_hours_default),
});
