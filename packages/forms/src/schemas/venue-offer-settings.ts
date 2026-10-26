import { z } from 'zod';

import type { Translate } from './translate';

/**
 * A venue's own booking-offer settings (Venue settings > Booking offers): the
 * fewest guests a host may offer to book for, the hours either side has to
 * answer a move, and the business the venue hopes each booking brings — at
 * least one amount, one per basis (per guest, per hour, per booking). The
 * amounts are a guide hosts see on Create Pod, never a rule. One rule for the
 * Partners console, mWeb and the native app (rules 27 + 56), with the same
 * `venueSettings.offers.*` copy.
 */

/** The bases a business amount may be named on (`VenueOfferModel`); FLAT reads as "per booking". */
export const MIN_BUSINESS_MODELS = ['PER_GUEST', 'PER_HOUR', 'FLAT'] as const;

/** One amount as typed: the basis and the rupees, kept as text until saved. */
export interface MinBusinessRowValues {
  model: string;
  amount: string;
}

/** The form, as typed: whole numbers, 0 = Duncit's platform default; the business amounts as rows. */
export interface BookingOffersValues {
  min_guests: string;
  response_hours: string;
  min_business: MinBusinessRowValues[];
}

/** The settings as stored (`VenueSettings.offers`, `VenueOfferSettingsInput`): 0 = Duncit's platform default. */
export interface VenueOfferSettings {
  min_guests: number;
  response_hours: number;
  /** Absent from older servers. */
  min_business?: readonly { model: string; amount: number }[] | null;
}

/** The server's bounds (venue.offerSettings `VENUE_OFFER_SETTINGS_MAX`; an amount within an offer's `MAX_OFFER_RATE`). */
export const BOOKING_OFFER_LIMITS = { minGuestsMax: 1000, responseHoursMax: 720, amountMax: 10_000_000 } as const;

/** A whole number from 0 to `max`; an empty box reads as 0 (Duncit's default). */
const isWholeUpTo = (raw: string, max: number) => {
  if (raw === '') return true;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max;
};

/** A basis the server takes a business amount on. */
const isMinBusinessModel = (model: string) => (MIN_BUSINESS_MODELS as readonly string[]).includes(model);

const isAmount = (raw: string) => {
  const n = Number(raw);
  return raw !== '' && Number.isFinite(n) && n > 0 && n <= BOOKING_OFFER_LIMITS.amountMax;
};

/** The business rows: at least one, a known basis each, each basis once, each amount above 0. */
function minBusinessField(t: Translate) {
  const row = z.object({
    model: z.string().refine(isMinBusinessModel, t('availability.offers.minBusiness.modelRequired')),
    amount: z
      .string()
      .trim()
      .refine(isAmount, t('availability.offers.minBusiness.amountInvalid', { vars: { max: BOOKING_OFFER_LIMITS.amountMax } })),
  });
  return z
    .array(row)
    .min(1, t('availability.offers.minBusiness.required'))
    .superRefine((rows, ctx) => {
      rows.forEach((entry, index) => {
        if (rows.findIndex((other) => other.model === entry.model) !== index) {
          ctx.addIssue({ code: 'custom', path: [index, 'model'], message: t('availability.offers.minBusiness.duplicate') });
        }
      });
    });
}

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
    min_business: minBusinessField(t),
  });
}

/** A fresh row for "Add amount": the first basis not listed yet. */
export function nextMinBusinessRow(rows: readonly MinBusinessRowValues[]): MinBusinessRowValues {
  const used = new Set(rows.map((row) => row.model));
  return { model: MIN_BUSINESS_MODELS.find((model) => !used.has(model)) ?? MIN_BUSINESS_MODELS[0], amount: '' };
}

/**
 * The stored settings as the form's values; a venue that never saved any reads
 * as 0 (the default), and one with no amounts starts with one empty row to fill.
 */
export const toBookingOffersValues = (offers?: VenueOfferSettings | null): BookingOffersValues => {
  const rows = (offers?.min_business ?? []).map((row) => ({ model: row.model, amount: String(row.amount) }));
  return {
    min_guests: String(offers?.min_guests ?? 0),
    response_hours: String(offers?.response_hours ?? 0),
    min_business: rows.length > 0 ? rows : [nextMinBusinessRow([])],
  };
};

/** The validated values as `VenueSettingsInput.offers` — an empty box is 0, Duncit's default. */
export const toBookingOffersInput = ({ min_guests, response_hours, min_business }: BookingOffersValues) => ({
  min_guests: Number(min_guests) || 0,
  response_hours: Number(response_hours) || 0,
  min_business: min_business.map((row) => ({ model: row.model, amount: Number(row.amount) })),
});
