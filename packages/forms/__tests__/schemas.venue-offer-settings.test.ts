/**
 * A venue's own booking-offer settings — one rule for the Partners console,
 * mWeb and the native app. Every assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';

import {
  BOOKING_OFFER_LIMITS,
  MIN_BUSINESS_MODELS,
  makeBookingOffersSchema,
  nextMinBusinessRow,
  toBookingOffersInput,
  toBookingOffersValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeBookingOffersSchema(t);

const messagesFor = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

/** One amount a venue hopes for, as typed. */
const amountRow = (model: string, amount: string) => ({ model, amount });
const guided = [amountRow('PER_GUEST', '200')];

const amountInvalid = `availability.offers.minBusiness.amountInvalid:${JSON.stringify({ max: 10_000_000 })}`;

describe('makeBookingOffersSchema', () => {
  it("mirrors the server's bounds", () => {
    expect(BOOKING_OFFER_LIMITS).toEqual({ minGuestsMax: 1000, responseHoursMax: 720, amountMax: 10_000_000 });
  });

  it("takes whole numbers up to the bounds, and an empty box as Duncit's default", () => {
    for (const [min, hours] of [['0', '0'], ['8', '24'], ['1000', '720'], ['', ''], [' 12 ', ' 48 ']]) {
      expect(messagesFor({ min_guests: min, response_hours: hours, min_business: guided })).toEqual([]);
    }
    expect(schema.parse({ min_guests: ' 12 ', response_hours: ' 48 ', min_business: guided })).toEqual({
      min_guests: '12',
      response_hours: '48',
      min_business: guided,
    });
  });

  it('refuses a fraction, a negative, a word or anything past the bounds', () => {
    const minInvalid = `min_guests=venueSettings.offers.minGuestsInvalid:${JSON.stringify({ max: 1000 })}`;
    const hoursInvalid = `response_hours=venueSettings.offers.responseHoursInvalid:${JSON.stringify({ max: 720 })}`;
    for (const [min, hours] of [['2.5', '1.5'], ['-1', '-3'], ['eight', 'day'], ['1001', '721']]) {
      expect(messagesFor({ min_guests: min, response_hours: hours, min_business: guided })).toEqual([minInvalid, hoursInvalid]);
    }
  });
});

describe('the business a venue hopes each booking brings', () => {
  const settings = (min_business: unknown) => ({ min_guests: '0', response_hours: '0', min_business });

  it('names the three bases an amount may be on', () => {
    expect(MIN_BUSINESS_MODELS).toEqual(['PER_GUEST', 'PER_HOUR', 'FLAT']);
  });

  it('takes one amount per basis, each above zero, trimmed', () => {
    const rows = [amountRow('PER_GUEST', ' 200 '), amountRow('PER_HOUR', '400'), amountRow('FLAT', '5000.50')];
    expect(schema.parse(settings(rows)).min_business).toEqual([
      amountRow('PER_GUEST', '200'),
      amountRow('PER_HOUR', '400'),
      amountRow('FLAT', '5000.50'),
    ]);
  });

  it('needs at least one amount', () => {
    expect(messagesFor(settings([]))).toEqual(['min_business=availability.offers.minBusiness.required']);
  });

  it('refuses a basis the server does not take, the retired per-slot one included', () => {
    for (const model of ['PER_SLOT', 'PER_DAY', '']) {
      expect(messagesFor(settings([amountRow(model, '200')]))).toEqual(['min_business.0.model=availability.offers.minBusiness.modelRequired']);
    }
  });

  it('refuses an empty, zero, negative or non-numeric amount, and one past the bound', () => {
    for (const amount of ['', '   ', '0', '-5', 'abc', 'Infinity', String(BOOKING_OFFER_LIMITS.amountMax + 1)]) {
      expect(messagesFor(settings([amountRow('FLAT', amount)]))).toEqual([`min_business.0.amount=${amountInvalid}`]);
    }
    expect(messagesFor(settings([amountRow('FLAT', String(BOOKING_OFFER_LIMITS.amountMax))]))).toEqual([]);
    expect(messagesFor(settings([amountRow('FLAT', '0.5')]))).toEqual([]);
  });

  it('flags a basis named twice on the later row, so the first one stands', () => {
    const rows = [amountRow('PER_GUEST', '200'), amountRow('FLAT', '5000'), amountRow('PER_GUEST', '250')];
    expect(messagesFor(settings(rows))).toEqual(['min_business.2.model=availability.offers.minBusiness.duplicate']);
  });

  it('flags every repeat of a basis, not just the first', () => {
    const rows = [amountRow('FLAT', '5000'), amountRow('FLAT', '6000'), amountRow('FLAT', '7000')];
    expect(messagesFor(settings(rows))).toEqual([
      'min_business.1.model=availability.offers.minBusiness.duplicate',
      'min_business.2.model=availability.offers.minBusiness.duplicate',
    ]);
  });
});

describe('nextMinBusinessRow', () => {
  it('adds the first basis not listed yet, with no amount', () => {
    expect(nextMinBusinessRow([])).toEqual(amountRow('PER_GUEST', ''));
    expect(nextMinBusinessRow([amountRow('PER_GUEST', '200')])).toEqual(amountRow('PER_HOUR', ''));
    expect(nextMinBusinessRow([amountRow('PER_HOUR', '400')])).toEqual(amountRow('PER_GUEST', ''));
    expect(nextMinBusinessRow([amountRow('PER_GUEST', '200'), amountRow('PER_HOUR', '400')])).toEqual(amountRow('FLAT', ''));
  });

  it('does not count a basis the server does not take as listed', () => {
    expect(nextMinBusinessRow([amountRow('PER_SLOT', '900')])).toEqual(amountRow('PER_GUEST', ''));
  });

  it('falls back to the first basis once every one is listed', () => {
    const all = [amountRow('FLAT', '5000'), amountRow('PER_HOUR', '400'), amountRow('PER_GUEST', '200')];
    expect(nextMinBusinessRow(all)).toEqual(amountRow('PER_GUEST', ''));
  });
});

describe('toBookingOffersValues / toBookingOffersInput', () => {
  const stored = {
    min_guests: 12,
    response_hours: 48,
    min_business: [
      { model: 'PER_GUEST', amount: 200 },
      { model: 'FLAT', amount: 5000.5 },
    ],
  };

  it('starts from what is stored, the amounts as typed text', () => {
    expect(toBookingOffersValues(stored)).toEqual({
      min_guests: '12',
      response_hours: '48',
      min_business: [amountRow('PER_GUEST', '200'), amountRow('FLAT', '5000.5')],
    });
  });

  it('reads nothing stored as the default, with one empty amount row to fill', () => {
    const fresh = { min_guests: '0', response_hours: '0', min_business: [amountRow('PER_GUEST', '')] };
    expect(toBookingOffersValues(null)).toEqual(fresh);
    expect(toBookingOffersValues(undefined)).toEqual(fresh);
    // Settings saved before amounts existed (older servers), or saved with none.
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48 }).min_business).toEqual([amountRow('PER_GUEST', '')]);
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48, min_business: null }).min_business).toEqual([amountRow('PER_GUEST', '')]);
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48, min_business: [] }).min_business).toEqual([amountRow('PER_GUEST', '')]);
  });

  it('will not save the empty starting row until the venue names an amount', () => {
    expect(messagesFor(toBookingOffersValues(null))).toEqual([`min_business.0.amount=${amountInvalid}`]);
  });

  it('sends numbers, an empty box as 0, and each amount in rupees', () => {
    expect(
      toBookingOffersInput({ min_guests: '12', response_hours: '48', min_business: [amountRow('PER_GUEST', '200'), amountRow('FLAT', '5000.5')] })
    ).toEqual(stored);
    expect(toBookingOffersInput({ min_guests: '', response_hours: '', min_business: [amountRow('PER_HOUR', '400')] })).toEqual({
      min_guests: 0,
      response_hours: 0,
      min_business: [{ model: 'PER_HOUR', amount: 400 }],
    });
  });

  it('round-trips stored settings through the form unchanged', () => {
    expect(toBookingOffersInput(schema.parse(toBookingOffersValues(stored)))).toEqual(stored);
  });
});
