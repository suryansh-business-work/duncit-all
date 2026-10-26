/**
 * Either side's counter to a booking offer, and what Create Pod asks of the
 * venue — one rule for the Partners console, mWeb and the native app. Every
 * assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  counterAsksMinGuests,
  makeVenueOfferAskSchema,
  makeVenueOfferCounterSchema,
  makeVenueOfferRejectSchema,
  venueOfferAskDefaults,
  venueOfferCounterDefaults,
  venueOfferCounterTermsOf,
  venueOfferEditDefaults,
  venueOfferRejectDefaults,
  venueOfferTermsOf,
  VENUE_OFFER_COUNTER_MODELS,
  VENUE_OFFER_GUESTS_MAX,
  VENUE_OFFER_IMAGES_MAX,
  VENUE_OFFER_NOTE_MAX,
  VENUE_OFFER_RATE_MAX,
  type VenueOfferCounterValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeVenueOfferCounterSchema(t, 20);

/** Raw input for the schema — any field may be wrong. */
const counter = (over: Record<string, unknown> = {}) => ({ model: 'FLAT', rate: '100', min_guests: '', offerings: '', note: '', images: [], ...over });

/** A counter form's values, as `venueOfferTermsOf` reads them. */
const formValues = (over: Partial<VenueOfferCounterValues> = {}): VenueOfferCounterValues => ({
  model: 'FLAT',
  rate: '100',
  min_guests: '',
  offerings: '',
  note: '',
  images: [],
  ...over,
});

const photos = (n: number) => Array.from({ length: n }, (_, i) => `https://ik.imagekit.io/duncit/offers/p${i}.jpg`);

const messagesFor = (values: Record<string, unknown>, against: z.ZodType = schema) => {
  const result = against.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeVenueOfferCounterSchema', () => {
  it('accepts a pricing option with a positive amount, a minimum and points, and trims the text', () => {
    expect(
      schema.parse(counter({ model: 'PER_GUEST', rate: ' 500 ', min_guests: ' 6 ', offerings: '- DJ\nSnacks', note: '  Weekend rate  ' }))
    ).toEqual({ model: 'PER_GUEST', rate: '500', min_guests: '6', offerings: '- DJ\nSnacks', note: 'Weekend rate', images: [] });
  });

  it('takes the three pricing options and refuses an unknown one, the retired per-slot option included', () => {
    expect(VENUE_OFFER_COUNTER_MODELS).toEqual(['PER_GUEST', 'PER_HOUR', 'FLAT']);
    for (const model of VENUE_OFFER_COUNTER_MODELS) expect(messagesFor(counter({ model }))).toEqual([]);
    expect(messagesFor(counter({ model: 'PER_DAY' }))).toEqual(['model=availability.offers.validation.model']);
    expect(messagesFor(counter({ model: 'PER_SLOT' }))).toEqual(['model=availability.offers.validation.model']);
  });

  it("carries up to the server's four photos, and refuses a fifth", () => {
    expect(VENUE_OFFER_IMAGES_MAX).toBe(4);
    expect(schema.parse(counter({ images: photos(4) })).images).toEqual(photos(4));
    expect(messagesFor(counter({ images: photos(5) }))).toEqual([
      `images=availability.offers.validation.imagesTooMany:${JSON.stringify({ max: 4 })}`,
    ]);
  });

  it('refuses a blank, zero, negative or non-numeric amount', () => {
    for (const rate of ['', '   ', '0', '-5', 'abc']) {
      expect(messagesFor(counter({ rate }))).toEqual(['rate=availability.offers.validation.rate']);
    }
  });

  it('refuses an amount above the server ceiling', () => {
    expect(messagesFor(counter({ rate: String(VENUE_OFFER_RATE_MAX + 1) }))).toEqual(['rate=availability.offers.validation.rateTooLarge']);
    expect(messagesFor(counter({ rate: String(VENUE_OFFER_RATE_MAX) }))).toEqual([]);
  });

  it("keeps the minimum a whole number from 1 up to the booking's guests; empty keeps the one on the table", () => {
    const tooMany = `min_guests=availability.offers.validation.minGuests:${JSON.stringify({ max: 20 })}`;
    for (const min of ['0', '21', '2.5', '-1', 'six']) expect(messagesFor(counter({ min_guests: min }))).toEqual([tooMany]);
    for (const min of ['', '1', '20']) expect(messagesFor(counter({ min_guests: min }))).toEqual([]);
  });

  it("bounds the minimum by the server's head count when the booking's guests are unknown", () => {
    const open = makeVenueOfferCounterSchema(t);
    expect(messagesFor(counter({ min_guests: String(VENUE_OFFER_GUESTS_MAX) }), open)).toEqual([]);
    expect(messagesFor(counter({ min_guests: String(VENUE_OFFER_GUESTS_MAX + 1) }), open)).toEqual([
      `min_guests=availability.offers.validation.minGuests:${JSON.stringify({ max: VENUE_OFFER_GUESTS_MAX })}`,
    ]);
  });

  it("lets a counter clear the points, but holds them to the server's count and length", () => {
    expect(messagesFor(counter({ offerings: '' }))).toEqual([]);
    const many = Array.from({ length: 21 }, (_, i) => `Point ${i}`).join('\n');
    expect(messagesFor(counter({ offerings: many }))).toEqual([
      `offerings=availability.offers.validation.offeringsTooMany:${JSON.stringify({ max: 20 })}`,
    ]);
    expect(messagesFor(counter({ offerings: `ok\n${'p'.repeat(121)}` }))).toEqual([
      `offerings=availability.offers.validation.offeringTooLong:${JSON.stringify({ max: 120 })}`,
    ]);
  });

  it('caps the note at the server limit', () => {
    expect(messagesFor(counter({ note: 'n'.repeat(1001) }))).toEqual([
      `note=availability.offers.validation.noteTooLong:${JSON.stringify({ max: 1000 })}`,
    ]);
    expect(messagesFor(counter({ note: 'n'.repeat(1000) }))).toEqual([]);
  });
});

describe('venueOfferCounterDefaults', () => {
  it('starts from the terms on the table, minimum and points included', () => {
    expect(venueOfferCounterDefaults({ model: 'PER_GUEST', rate: 450, minGuests: 6, offerings: ['DJ', 'Snacks'] })).toEqual({
      model: 'PER_GUEST',
      rate: '450',
      min_guests: '6',
      offerings: 'DJ\nSnacks',
      note: '',
      images: [],
    });
  });

  it('falls back to a flat price with nothing else for missing or unknown terms', () => {
    const blank = { model: 'FLAT', rate: '', min_guests: '', offerings: '', note: '', images: [] };
    expect(venueOfferCounterDefaults(null)).toEqual(blank);
    expect(venueOfferCounterDefaults({ model: 'PER_DAY', rate: 0, minGuests: 0 })).toEqual(blank);
    expect(venueOfferCounterDefaults({ model: 'PER_SLOT', rate: 0, minGuests: 0 })).toEqual(blank);
    expect(venueOfferCounterDefaults({ model: null, rate: null, minGuests: null, offerings: null })).toEqual(blank);
  });

  it('starts a counter the form validates as it stands', () => {
    expect(messagesFor(venueOfferCounterDefaults({ model: 'PER_HOUR', rate: 800, minGuests: null, offerings: ['Projector'] }))).toEqual([]);
  });
});

describe('venueOfferEditDefaults', () => {
  it('starts an edit from the counter as it was sent, its note and photos kept', () => {
    const images = photos(2);
    const edit = venueOfferEditDefaults({ model: 'PER_GUEST', rate: 450, minGuests: 6, offerings: ['DJ'], note: 'Weekend rate', images });
    expect(edit).toEqual({
      model: 'PER_GUEST',
      rate: '450',
      min_guests: '6',
      offerings: 'DJ',
      note: 'Weekend rate',
      images: photos(2),
    });
    // The form gets its own list, so adding or removing a photo never touches the sent counter.
    expect(edit.images).not.toBe(images);
  });

  it('starts with no note or photos when the counter carried none', () => {
    expect(venueOfferEditDefaults({ model: 'FLAT', rate: 6000, note: null, images: null })).toMatchObject({ note: '', images: [] });
    expect(venueOfferEditDefaults({ model: 'FLAT', rate: 6000 })).toMatchObject({ rate: '6000', note: '', images: [] });
    expect(venueOfferEditDefaults(null)).toEqual({ model: 'FLAT', rate: '', min_guests: '', offerings: '', note: '', images: [] });
  });
});

describe('venueOfferTermsOf', () => {
  it('sends the option, the amount and the points, with the minimum only when one was typed', () => {
    expect(venueOfferTermsOf(formValues({ model: 'PER_GUEST', rate: ' 500 ', min_guests: '6', offerings: '- DJ\n\nSnacks' }))).toEqual({
      model: 'PER_GUEST',
      rate: 500,
      min_guests: 6,
      offerings: ['DJ', 'Snacks'],
    });
    expect(venueOfferTermsOf(formValues({ rate: '7000' }))).toEqual({ model: 'FLAT', rate: 7000, offerings: [] });
  });

  it('is null until the amount and any minimum are usable', () => {
    for (const rate of ['', 'abc', '0', '-1']) expect(venueOfferTermsOf(formValues({ rate }))).toBeNull();
    for (const min of ['0', '2.5', 'six']) expect(venueOfferTermsOf(formValues({ min_guests: min }))).toBeNull();
  });

  it('sends the photos as a list of its own, beside the minimum', () => {
    const images = photos(2);
    const terms = venueOfferTermsOf(formValues({ model: 'PER_GUEST', rate: '500', min_guests: '6', images }));
    expect(terms).toEqual({ model: 'PER_GUEST', rate: 500, min_guests: 6, offerings: [], images: photos(2) });
    expect(terms?.images).not.toBe(images);
  });

  it('leaves the photos out when the form has none', () => {
    expect(venueOfferTermsOf(formValues({ images: [] }))).not.toHaveProperty('images');
    expect(venueOfferTermsOf({ model: 'FLAT', rate: '7000', min_guests: '', offerings: '' })).toEqual({ model: 'FLAT', rate: 7000, offerings: [] });
  });
});

describe('venueOfferCounterTermsOf', () => {
  it('asks a minimum only beside a per-guest price', () => {
    expect(counterAsksMinGuests('PER_GUEST')).toBe(true);
    for (const model of ['PER_HOUR', 'FLAT']) expect(counterAsksMinGuests(model)).toBe(false);
  });

  it('sends the minimum with a per-guest price, and leaves it out (the one on the table stands) otherwise', () => {
    expect(venueOfferCounterTermsOf(formValues({ model: 'PER_GUEST', rate: '600', min_guests: '6' }))).toMatchObject({ min_guests: 6 });
    expect(venueOfferCounterTermsOf(formValues({ model: 'FLAT', rate: '7000', min_guests: '6' }))).toEqual({
      model: 'FLAT',
      rate: 7000,
      offerings: [],
    });
  });

  it('keeps the photos whichever option the counter uses', () => {
    expect(venueOfferCounterTermsOf(formValues({ model: 'PER_HOUR', rate: '900', min_guests: '6', images: photos(1) }))).toEqual({
      model: 'PER_HOUR',
      rate: 900,
      offerings: [],
      images: photos(1),
    });
    expect(venueOfferCounterTermsOf(formValues({ model: 'PER_GUEST', rate: '600', min_guests: '6', images: photos(3) }))?.images).toEqual(photos(3));
  });

  it('is null until the per-guest minimum is usable', () => {
    expect(venueOfferCounterTermsOf(formValues({ model: 'PER_GUEST', rate: '600', min_guests: '0' }))).toBeNull();
    // A stale minimum left behind by another option does not block it.
    expect(venueOfferCounterTermsOf(formValues({ model: 'FLAT', rate: '7000', min_guests: 'six' }))).not.toBeNull();
  });
});

describe('makeVenueOfferAskSchema', () => {
  const ask = makeVenueOfferAskSchema(t);

  it('needs at least one point and takes an optional, trimmed note', () => {
    expect(messagesFor(venueOfferAskDefaults, ask)).toEqual(['offerings=availability.offers.validation.offeringsRequired']);
    expect(messagesFor({ offerings: ' \n - \n', note: '' }, ask)).toEqual(['offerings=availability.offers.validation.offeringsRequired']);
    expect(ask.parse({ offerings: 'Projector', note: '  Quiet corner  ' })).toEqual({ offerings: 'Projector', note: 'Quiet corner' });
  });

  it("holds the points and the note to the server's bounds", () => {
    expect(messagesFor({ offerings: 'p'.repeat(121), note: '' }, ask)).toEqual([
      `offerings=availability.offers.validation.offeringTooLong:${JSON.stringify({ max: 120 })}`,
    ]);
    expect(messagesFor({ offerings: 'Projector', note: 'n'.repeat(1001) }, ask)).toEqual([
      `note=availability.offers.validation.noteTooLong:${JSON.stringify({ max: 1000 })}`,
    ]);
  });
});

describe('makeVenueOfferRejectSchema', () => {
  const reject = makeVenueOfferRejectSchema(t);

  it('takes no reason, or a trimmed one', () => {
    expect(reject.parse(venueOfferRejectDefaults)).toEqual({ reason: '' });
    expect(reject.parse({ reason: '  Fully booked  ' })).toEqual({ reason: 'Fully booked' });
  });

  it('caps the reason at its limit', () => {
    const result = reject.safeParse({ reason: 'r'.repeat(VENUE_OFFER_NOTE_MAX + 1) });
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      `availability.offers.validation.noteTooLong:${JSON.stringify({ max: VENUE_OFFER_NOTE_MAX })}`,
    ]);
  });
});
