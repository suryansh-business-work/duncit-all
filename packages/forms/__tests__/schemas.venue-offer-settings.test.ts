/**
 * A venue's own booking-offer settings — one rule for the Partners console,
 * mWeb and the native app. Every assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';

import {
  BOOKING_OFFER_LIMITS,
  makeBookingOffersSchema,
  toBookingOffersInput,
  toBookingOffersValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeBookingOffersSchema(t);

const messagesFor = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeBookingOffersSchema', () => {
  it("mirrors the server's bounds", () => {
    expect(BOOKING_OFFER_LIMITS).toEqual({ minGuestsMax: 1000, responseHoursMax: 720 });
  });

  it("takes whole numbers up to the bounds, and an empty box as Duncit's default", () => {
    for (const [min, hours] of [['0', '0'], ['8', '24'], ['1000', '720'], ['', ''], [' 12 ', ' 48 ']]) {
      expect(messagesFor({ min_guests: min, response_hours: hours })).toEqual([]);
    }
    expect(schema.parse({ min_guests: ' 12 ', response_hours: ' 48 ' })).toEqual({ min_guests: '12', response_hours: '48' });
  });

  it('refuses a fraction, a negative, a word or anything past the bounds', () => {
    const minInvalid = `min_guests=venueSettings.offers.minGuestsInvalid:${JSON.stringify({ max: 1000 })}`;
    const hoursInvalid = `response_hours=venueSettings.offers.responseHoursInvalid:${JSON.stringify({ max: 720 })}`;
    for (const [min, hours] of [['2.5', '1.5'], ['-1', '-3'], ['eight', 'day'], ['1001', '721']]) {
      expect(messagesFor({ min_guests: min, response_hours: hours })).toEqual([minInvalid, hoursInvalid]);
    }
  });
});

describe('toBookingOffersValues / toBookingOffersInput', () => {
  it('starts from what is stored, and reads nothing stored as the default', () => {
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48 })).toEqual({ min_guests: '12', response_hours: '48' });
    expect(toBookingOffersValues(null)).toEqual({ min_guests: '0', response_hours: '0' });
    expect(toBookingOffersValues(undefined)).toEqual({ min_guests: '0', response_hours: '0' });
  });

  it('sends numbers, an empty box as 0', () => {
    expect(toBookingOffersInput({ min_guests: '12', response_hours: '48' })).toEqual({ min_guests: 12, response_hours: 48 });
    expect(toBookingOffersInput({ min_guests: '', response_hours: '' })).toEqual({ min_guests: 0, response_hours: 0 });
  });
});
