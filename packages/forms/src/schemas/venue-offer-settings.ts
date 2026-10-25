import { z } from 'zod';

import type { Translate } from './translate';

/**
 * A venue's own booking-offer settings (Venue settings > Booking offers): the
 * fewest guests a host may offer to book for, and the hours either side has to
 * answer a move. One rule for the Partners console, mWeb and the native app
 * (rules 27 + 56), with the same `venueSettings.offers.*` copy.
 */

/** The form, as typed: whole numbers, 0 = Duncit's platform default. */
export interface BookingOffersValues {
  min_guests: string;
  response_hours: string;
}

/** The settings as stored (`VenueSettings.offers`, `VenueOfferSettingsInput`): 0 = Duncit's platform default. */
export interface VenueOfferSettings {
  min_guests: number;
  response_hours: number;
}

/** The server's bounds (venue.offerSettings `VENUE_OFFER_SETTINGS_MAX`). */
export const BOOKING_OFFER_LIMITS = { minGuestsMax: 1000, responseHoursMax: 720 } as const;

/** A whole number from 0 to `max`; an empty box reads as 0 (Duncit's default). */
const isWholeUpTo = (raw: string, max: number) => {
  if (raw === '') return true;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max;
};

/** The Booking offers rules, with the reader's messages. */
export function makeBookingOffersSchema(t: Translate) {
  const { minGuestsMax, responseHoursMax } = BOOKING_OFFER_LIMITS;
  return z.object({
    min_guests: z
      .string()
      .trim()
      .refine((raw) => isWholeUpTo(raw, minGuestsMax), {
        message: t('venueSettings.offers.minGuestsInvalid', { vars: { max: minGuestsMax } }),
      }),
    response_hours: z
      .string()
      .trim()
      .refine((raw) => isWholeUpTo(raw, responseHoursMax), {
        message: t('venueSettings.offers.responseHoursInvalid', { vars: { max: responseHoursMax } }),
      }),
  });
}

/** The stored settings as the form's values; a venue that never saved any reads as 0 (the default). */
export const toBookingOffersValues = (offers?: VenueOfferSettings | null): BookingOffersValues => ({
  min_guests: String(offers?.min_guests ?? 0),
  response_hours: String(offers?.response_hours ?? 0),
});

/** The validated values as `VenueSettingsInput.offers` — an empty box is 0, Duncit's default. */
export const toBookingOffersInput = ({ min_guests, response_hours }: BookingOffersValues): VenueOfferSettings => ({
  min_guests: Number(min_guests) || 0,
  response_hours: Number(response_hours) || 0,
});
