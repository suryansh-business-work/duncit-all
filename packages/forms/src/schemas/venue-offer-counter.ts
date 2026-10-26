import { z } from 'zod';
import { VENUE_OFFER_ASK_LIMITS, offeringsFromText, offeringsToText } from '@duncit/utils';

import type { Translate } from './translate';

/** The three ways a booking can be priced (`VenueOfferModel`) — what the host offered with, and what a counter may use. */
export const VENUE_OFFER_COUNTER_MODELS = ['PER_GUEST', 'PER_HOUR', 'FLAT'] as const;

/** The server's bound on the photos one counter carries (venueOffer `OFFER_ASK_LIMITS.images`). */
export const VENUE_OFFER_IMAGES_MAX = 4;

/** A reject reason's bound (the host reads it in a notification). */
export const VENUE_OFFER_NOTE_MAX = 280;
/** The server's bound on an offered amount (venueOffer `MAX_OFFER_RATE`). */
export const VENUE_OFFER_RATE_MAX = 10_000_000;
/** The most guests a minimum may name when the booking's own guests are unknown (the server's head-count bound). */
export const VENUE_OFFER_GUESTS_MAX = 10_000;

/**
 * "What you need from the venue", one point per line: optional on a counter
 * (an empty box clears them), required on Create Pod. Bounded as the server
 * bounds them (`VENUE_OFFER_ASK_LIMITS`). For embedding in a larger form.
 */
export function offeringsTextField(t: Translate, required: boolean) {
  const { offerings: most, offeringLength } = VENUE_OFFER_ASK_LIMITS;
  return z.string().superRefine((text, ctx) => {
    const points = offeringsFromText(text);
    if (required && points.length === 0) {
      ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.offeringsRequired') });
    } else if (points.length > most) {
      ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.offeringsTooMany', { vars: { max: most } }) });
    } else if (points.some((point) => point.length > offeringLength)) {
      ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.offeringTooLong', { vars: { max: offeringLength } }) });
    }
  });
}

/** A note to the other side: optional, trimmed, at most the server's 1000 characters. For embedding in a larger form. */
export function offerNoteField(t: Translate) {
  const max = VENUE_OFFER_ASK_LIMITS.note;
  return z.string().trim().max(max, t('availability.offers.validation.noteTooLong', { vars: { max } }));
}

/**
 * What a host asks of the venue on Create Pod beside the price: the points it
 * should provide (at least one) and an optional note. mWeb and the native app
 * embed the two fields in their own Step 3 schema.
 */
export function makeVenueOfferAskSchema(t: Translate) {
  return z.object({ offerings: offeringsTextField(t, true), note: offerNoteField(t) });
}

export type VenueOfferAskValues = z.input<ReturnType<typeof makeVenueOfferAskSchema>>;

export const venueOfferAskDefaults: VenueOfferAskValues = { offerings: '', note: '' };

/**
 * Either side's counter to the terms on the table: a pricing option, the
 * amount, the fewest guests the venue is paid for, the points, an optional
 * note and up to four photos uploaded from the device. One rule for the Partners console, mWeb and the native sheet, for the
 * venue's counter and the host's counter back (rules 27 + 56); the server
 * prices the terms, so the amount is kept as typed text and only checked to be
 * a usable number. `maxGuests` is the booking's guests — a minimum may not pass
 * them; 0 when unknown.
 */
export function makeVenueOfferCounterSchema(t: Translate, maxGuests = 0) {
  const most = maxGuests > 0 ? maxGuests : VENUE_OFFER_GUESTS_MAX;
  return z.object({
    model: z.enum(VENUE_OFFER_COUNTER_MODELS, { error: t('availability.offers.validation.model') }),
    rate: z
      .string()
      .trim()
      .refine((value) => {
        const rate = Number(value);
        return value !== '' && Number.isFinite(rate) && rate > 0;
      }, t('availability.offers.validation.rate'))
      // Only a real number can be too large; anything else already failed the check above.
      .refine((value) => !Number.isFinite(Number(value)) || Number(value) <= VENUE_OFFER_RATE_MAX, t('availability.offers.validation.rateTooLarge')),
    // Empty = keep the minimum on the table.
    min_guests: z
      .string()
      .trim()
      .refine((value) => {
        if (value === '') return true;
        const min = Number(value);
        return Number.isInteger(min) && min >= 1 && min <= most;
      }, t('availability.offers.validation.minGuests', { vars: { max: most } })),
    offerings: offeringsTextField(t, false),
    note: offerNoteField(t),
    images: z
      .array(z.string())
      .max(VENUE_OFFER_IMAGES_MAX, t('availability.offers.validation.imagesTooMany', { vars: { max: VENUE_OFFER_IMAGES_MAX } })),
  });
}

export type VenueOfferCounterValues = z.input<ReturnType<typeof makeVenueOfferCounterSchema>>;

/** One side's terms, as the counter form starts from them (`currentOfferTerms`). */
export interface VenueOfferCounterSource {
  model?: string | null;
  rate?: number | null;
  minGuests?: number | null;
  offerings?: readonly string[] | null;
}

/** Starts from the terms on the table, so a counter is an edit of them. */
export function venueOfferCounterDefaults(terms: VenueOfferCounterSource | null): VenueOfferCounterValues {
  const known = VENUE_OFFER_COUNTER_MODELS as readonly string[];
  const model = terms?.model && known.includes(terms.model) ? (terms.model as VenueOfferCounterValues['model']) : 'FLAT';
  return {
    model,
    rate: terms?.rate ? String(terms.rate) : '',
    min_guests: terms?.minGuests ? String(terms.minGuests) : '',
    offerings: offeringsToText(terms?.offerings),
    note: '',
    images: [],
  };
}

/** A counter of one's own, as it was sent: its note and photos are kept, so an edit starts from it whole. */
export function venueOfferEditDefaults(
  terms: (VenueOfferCounterSource & { note?: string | null; images?: readonly string[] | null }) | null,
): VenueOfferCounterValues {
  return { ...venueOfferCounterDefaults(terms), note: terms?.note ?? '', images: [...(terms?.images ?? [])] };
}

/** What a counter carries to the server (`VenueOfferTermsInput`). */
export interface VenueOfferTerms {
  model: (typeof VENUE_OFFER_COUNTER_MODELS)[number];
  rate: number;
  /** Left out: the minimum on the table stands. */
  min_guests?: number;
  offerings: string[];
  /** Photos uploaded from the device; none when the form sends none. */
  images?: string[];
}

/**
 * The terms a counter sends, or null until the amount and any minimum are
 * usable — the live quote asks nothing until then.
 */
export function venueOfferTermsOf(
  values: Readonly<Pick<VenueOfferCounterValues, 'model' | 'rate' | 'min_guests' | 'offerings'> & { images?: readonly string[] }>,
): VenueOfferTerms | null {
  const rate = Number(String(values.rate).trim());
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const terms: VenueOfferTerms = { model: values.model, rate, offerings: offeringsFromText(values.offerings) };
  if (values.images?.length) terms.images = [...values.images];
  const minText = values.min_guests.trim();
  if (minText === '') return terms;
  const min = Number(minText);
  return Number.isInteger(min) && min >= 1 ? { ...terms, min_guests: min } : null;
}

/** Only a per-guest price is paid for a minimum of guests; any other option sends none. */
export const counterAsksMinGuests = (model: string): boolean => model === 'PER_GUEST';

/**
 * The terms a counter sends — `venueOfferTermsOf`, with the minimum only beside
 * a per-guest price (left out, the minimum on the table stands). The Partners
 * console, mWeb and the native sheet all send this.
 */
export function venueOfferCounterTermsOf(
  values: Readonly<Pick<VenueOfferCounterValues, 'model' | 'rate' | 'min_guests' | 'offerings'> & { images?: readonly string[] }>,
): VenueOfferTerms | null {
  return venueOfferTermsOf(counterAsksMinGuests(values.model) ? values : { ...values, min_guests: '' });
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
