import { z } from 'zod';

import type { Translate } from './translate';

/** The four ways a booking can be priced (`VenueOfferModel`) — what the host offered with, and what a counter may use. */
export const VENUE_OFFER_COUNTER_MODELS = ['PER_GUEST', 'PER_HOUR', 'PER_SLOT', 'FLAT'] as const;

/** The server's bounds (venueOffer `NOTE_MAX`, `MAX_OFFER_RATE`). */
export const VENUE_OFFER_NOTE_MAX = 280;
export const VENUE_OFFER_RATE_MAX = 10_000_000;

/**
 * A venue owner's counter to a host's booking offer: a pricing option, the
 * amount, and an optional note to the host. One rule for the Partners console,
 * mWeb and the native sheet (rules 27 + 56); the server prices the terms, so
 * the amount is kept as typed text and only checked to be a usable number.
 */
export function makeVenueOfferCounterSchema(t: Translate) {
  return z.object({
    model: z.enum(VENUE_OFFER_COUNTER_MODELS, { error: t('availability.offers.validation.model') }),
    rate: z
      .string()
      .trim()
      .refine((value) => {
        const rate = Number(value);
        return value !== '' && Number.isFinite(rate) && rate > 0;
      }, t('availability.offers.validation.rate'))
      .refine((value) => Number(value) <= VENUE_OFFER_RATE_MAX, t('availability.offers.validation.rateTooLarge')),
    note: z
      .string()
      .trim()
      .max(VENUE_OFFER_NOTE_MAX, t('availability.offers.validation.noteTooLong', { vars: { max: VENUE_OFFER_NOTE_MAX } })),
  });
}

export type VenueOfferCounterValues = z.input<ReturnType<typeof makeVenueOfferCounterSchema>>;

/** Starts from the terms on the table, so a counter is an edit of them. */
export function venueOfferCounterDefaults(terms: { model?: string | null; rate?: number | null } | null): VenueOfferCounterValues {
  const known = VENUE_OFFER_COUNTER_MODELS as readonly string[];
  const model = terms?.model && known.includes(terms.model) ? (terms.model as VenueOfferCounterValues['model']) : 'FLAT';
  return { model, rate: terms?.rate ? String(terms.rate) : '', note: '' };
}

/** A venue owner rejecting a host's booking offer: an optional reason the host is told. */
export function makeVenueOfferRejectSchema(t: Translate) {
  return z.object({
    reason: z
      .string()
      .trim()
      .max(VENUE_OFFER_NOTE_MAX, t('availability.offers.validation.noteTooLong', { vars: { max: VENUE_OFFER_NOTE_MAX } })),
  });
}

export type VenueOfferRejectValues = z.input<ReturnType<typeof makeVenueOfferRejectSchema>>;

export const venueOfferRejectDefaults: VenueOfferRejectValues = { reason: '' };
