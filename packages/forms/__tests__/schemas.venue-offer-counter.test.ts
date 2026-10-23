/**
 * A venue owner's counter to a host's booking offer — one rule for the Partners
 * console, mWeb and the native sheet. Every assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';

import {
  makeVenueOfferCounterSchema,
  makeVenueOfferRejectSchema,
  venueOfferCounterDefaults,
  venueOfferRejectDefaults,
  VENUE_OFFER_NOTE_MAX,
  VENUE_OFFER_RATE_MAX,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeVenueOfferCounterSchema(t);

const messagesFor = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeVenueOfferCounterSchema', () => {
  it('accepts a pricing option with a positive amount, and trims the note', () => {
    expect(schema.parse({ model: 'PER_HOUR', rate: ' 1500 ', note: '  Weekend rate  ' })).toEqual({
      model: 'PER_HOUR',
      rate: '1500',
      note: 'Weekend rate',
    });
  });

  it('refuses an unknown pricing option', () => {
    expect(messagesFor({ model: 'PER_DAY', rate: '100', note: '' })).toEqual([
      'model=availability.offers.validation.model',
    ]);
  });

  it('refuses a blank, zero, negative or non-numeric amount', () => {
    for (const rate of ['', '   ', '0', '-5', 'abc']) {
      expect(messagesFor({ model: 'FLAT', rate, note: '' })).toEqual(['rate=availability.offers.validation.rate']);
    }
  });

  it('refuses an amount above the server ceiling', () => {
    expect(messagesFor({ model: 'FLAT', rate: String(VENUE_OFFER_RATE_MAX + 1), note: '' })).toEqual([
      'rate=availability.offers.validation.rateTooLarge',
    ]);
    expect(messagesFor({ model: 'FLAT', rate: String(VENUE_OFFER_RATE_MAX), note: '' })).toEqual([]);
  });

  it('caps the note at the server limit', () => {
    expect(messagesFor({ model: 'FLAT', rate: '100', note: 'x'.repeat(VENUE_OFFER_NOTE_MAX + 1) })).toEqual([
      `note=availability.offers.validation.noteTooLong:${JSON.stringify({ max: VENUE_OFFER_NOTE_MAX })}`,
    ]);
  });
});

describe('venueOfferCounterDefaults', () => {
  it('starts from the terms on the table', () => {
    expect(venueOfferCounterDefaults({ model: 'PER_GUEST', rate: 450 })).toEqual({ model: 'PER_GUEST', rate: '450', note: '' });
  });

  it('falls back to a flat price with no amount for missing or unknown terms', () => {
    expect(venueOfferCounterDefaults(null)).toEqual({ model: 'FLAT', rate: '', note: '' });
    expect(venueOfferCounterDefaults({ model: 'PER_DAY', rate: 0 })).toEqual({ model: 'FLAT', rate: '', note: '' });
    expect(venueOfferCounterDefaults({ model: null, rate: null })).toEqual({ model: 'FLAT', rate: '', note: '' });
  });
});

describe('makeVenueOfferRejectSchema', () => {
  const reject = makeVenueOfferRejectSchema(t);

  it('takes no reason, or a trimmed one', () => {
    expect(reject.parse(venueOfferRejectDefaults)).toEqual({ reason: '' });
    expect(reject.parse({ reason: '  Fully booked  ' })).toEqual({ reason: 'Fully booked' });
  });

  it('caps the reason at the server limit', () => {
    const result = reject.safeParse({ reason: 'x'.repeat(VENUE_OFFER_NOTE_MAX + 1) });
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      `availability.offers.validation.noteTooLong:${JSON.stringify({ max: VENUE_OFFER_NOTE_MAX })}`,
    ]);
  });
});
