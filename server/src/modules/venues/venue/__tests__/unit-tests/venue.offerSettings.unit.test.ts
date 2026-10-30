/**
 * A venue's own terms for booking offers — the fewest guests and the hours to
 * answer, with 0 meaning "the platform's default", read once per request — and
 * the business it hopes each booking brings.
 */
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getVenueOfferDefaults: jest.fn() },
}));

import { settingsService } from '@modules/platform/settings/settings.service';
import {
  VENUE_OFFER_SETTINGS_MAX,
  assertOfferMeetsMinBusiness,
  cleanMinBusiness,
  effectiveOfferSettings,
  normalizeOfferSettingsInput,
  requestOfferDefaults,
  toOfferSettingsPub,
  venueOfferSettingsOf,
} from '../../venue.offerSettings';

const defaults = settingsService.getVenueOfferDefaults as jest.Mock;

beforeEach(() => {
  defaults.mockResolvedValue({ min_guests: 8, response_hours: 24 });
});

describe('toOfferSettingsPub', () => {
  it('reads a venue that never set them as the defaults (0)', () => {
    const none = { min_guests: 0, response_hours: 0, min_business: [] };
    expect(toOfferSettingsPub(undefined)).toEqual(none);
    expect(toOfferSettingsPub(null)).toEqual(none);
    expect(toOfferSettingsPub({})).toEqual(none);
  });

  it('keeps whole values and clamps the out-of-range ones', () => {
    expect(toOfferSettingsPub({ min_guests: 12.6, response_hours: 48 })).toEqual({ min_guests: 12, response_hours: 48, min_business: [] });
    expect(toOfferSettingsPub({ min_guests: -5, response_hours: 99_999 })).toEqual({
      min_guests: 0,
      response_hours: VENUE_OFFER_SETTINGS_MAX.responseHours,
      min_business: [],
    });
  });

  it("reads the business amounts in the pickers' order, dropping unknown bases and non-positive amounts", () => {
    const stored = [
      { model: 'FLAT' as const, amount: 1500.456 },
      { model: 'PER_SLOT' as never, amount: 900 },
      { model: 'PER_HOUR' as const, amount: 0 },
      { model: 'PER_GUEST' as const, amount: 200 },
    ];
    expect(toOfferSettingsPub({ min_business: stored }).min_business).toEqual([
      { model: 'PER_GUEST', amount: 200 },
      { model: 'FLAT', amount: 1500.46 },
    ]);
  });
});

describe('normalizeOfferSettingsInput', () => {
  const base = { min_guests: 10, response_hours: 6, min_business: [{ model: 'PER_GUEST' as const, amount: 200 }] };

  it('changes only what the edit names', () => {
    expect(normalizeOfferSettingsInput(base, { min_guests: 4 })).toEqual({ ...base, min_guests: 4 });
    expect(normalizeOfferSettingsInput(base, { response_hours: 72 })).toEqual({ ...base, response_hours: 72 });
    expect(normalizeOfferSettingsInput(base, { min_guests: null, response_hours: undefined })).toEqual(base);
  });

  it('clamps an out-of-range edit and keeps the stored value for one that is not a number', () => {
    expect(normalizeOfferSettingsInput(base, { min_guests: 5000, response_hours: -1 })).toEqual({
      ...base,
      min_guests: VENUE_OFFER_SETTINGS_MAX.minGuests,
      response_hours: 0,
    });
    expect(normalizeOfferSettingsInput(base, { min_guests: 'lots', response_hours: 'soon' })).toEqual(base);
  });

  it('replaces the business amounts when an edit sends them', () => {
    const next = normalizeOfferSettingsInput(base, {
      min_business: [
        { model: 'PER_HOUR', amount: 400 },
        { model: 'PER_GUEST', amount: 250 },
      ],
    });
    expect(next.min_business).toEqual([
      { model: 'PER_GUEST', amount: 250 },
      { model: 'PER_HOUR', amount: 400 },
    ]);
  });

  it('keeps the stored amounts when an edit (or an app from before them) leaves them out', () => {
    expect(normalizeOfferSettingsInput(base, { min_business: null }).min_business).toEqual(base.min_business);
    expect(normalizeOfferSettingsInput(base, { min_guests: 3 }).min_business).toEqual(base.min_business);
  });

  it('refuses an edit whose amounts are not sound, rather than saving them', () => {
    expect(() => normalizeOfferSettingsInput(base, { min_business: [{ model: 'FLAT', amount: 0 }] })).toThrow(
      'Enter an amount above 0 for each booking type'
    );
  });
});

describe('cleanMinBusiness', () => {
  it.each([
    ['an empty list', []],
    ['no list at all', 'none'],
    ['an unknown basis', [{ model: 'PER_SLOT', amount: 100 }]],
    ['a basis twice', [{ model: 'FLAT', amount: 100 }, { model: 'FLAT', amount: 200 }]],
    ['a zero amount', [{ model: 'FLAT', amount: 0 }]],
    ['an amount that is not a number', [{ model: 'FLAT', amount: 'lots' }]],
    ["an amount past an offer's bound", [{ model: 'FLAT', amount: 10_000_001 }]],
    ['a row that is not an amount at all', [null]],
  ])('refuses %s', (_label, raw) => {
    expect(() => cleanMinBusiness(raw)).toThrow(expect.objectContaining({ extensions: expect.objectContaining({ code: 'BAD_USER_INPUT', field: 'min_business' }) }));
  });

  it('says what is wrong with each refusal', () => {
    expect(() => cleanMinBusiness([])).toThrow('Add the business you expect from at least one booking type');
    expect(() => cleanMinBusiness([{ model: 'PER_SLOT', amount: 100 }])).toThrow('Pick per guest, per hour or per booking for each amount');
    expect(() => cleanMinBusiness([{ model: 'FLAT', amount: 1 }, { model: 'FLAT', amount: 2 }])).toThrow('Each booking type can be listed once');
    expect(() => cleanMinBusiness([{ model: 'FLAT', amount: -5 }])).toThrow('Enter an amount above 0 for each booking type');
    expect(() => cleanMinBusiness([{ model: 'FLAT', amount: 10_000_001 }])).toThrow('This amount is too large');
  });

  it('keeps one amount per basis, rounded to the paisa', () => {
    expect(cleanMinBusiness([{ model: 'PER_HOUR', amount: 399.999 }])).toEqual([{ model: 'PER_HOUR', amount: 400 }]);
  });

  it("accepts every basis at once, an amount at the offer's bound, and a number sent as text", () => {
    expect(
      cleanMinBusiness([
        { model: 'FLAT', amount: 10_000_000 },
        { model: 'PER_HOUR', amount: '450' },
        { model: 'PER_GUEST', amount: 0.5 },
      ])
    ).toEqual([
      { model: 'PER_GUEST', amount: 0.5 },
      { model: 'PER_HOUR', amount: 450 },
      { model: 'FLAT', amount: 10_000_000 },
    ]);
  });
});

describe('effectiveOfferSettings', () => {
  it("uses the venue's own values, and the platform's for any left at 0", () => {
    expect(effectiveOfferSettings({ min_guests: 5, response_hours: 0 }, { min_guests: 8, response_hours: 24 })).toEqual({
      min_guests: 5,
      response_hours: 24,
    });
    expect(effectiveOfferSettings(undefined, { min_guests: 8, response_hours: 24 })).toEqual({ min_guests: 8, response_hours: 24 });
  });
});

describe('venueOfferSettingsOf', () => {
  it("reads the platform defaults beneath a venue's settings", async () => {
    await expect(venueOfferSettingsOf({ settings: { offers: { min_guests: 3, response_hours: 0 } } })).resolves.toEqual({
      min_guests: 3,
      response_hours: 24,
    });
    await expect(venueOfferSettingsOf({ settings: null })).resolves.toEqual({ min_guests: 8, response_hours: 24 });
  });
});

describe('requestOfferDefaults', () => {
  it('reads the defaults once per request, however many venues it resolves', async () => {
    const ctx = {};
    const other = {};
    await requestOfferDefaults(ctx);
    await requestOfferDefaults(ctx);
    await requestOfferDefaults(other);
    expect(defaults).toHaveBeenCalledTimes(2);
  });
});

describe('assertOfferMeetsMinBusiness', () => {
  const rows = [
    { model: 'PER_GUEST' as const, amount: 200 },
    { model: 'FLAT' as const, amount: 5000 },
  ];
  const refusal = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      return (e as { extensions?: Record<string, unknown> }).extensions;
    }
    return null;
  };

  it('accepts a rate at or above the amount on its own basis', () => {
    expect(() => assertOfferMeetsMinBusiness(rows, 'PER_GUEST', 200)).not.toThrow();
    expect(() => assertOfferMeetsMinBusiness(rows, 'FLAT', 6000)).not.toThrow();
  });

  it('refuses a rate below it, naming the amount and the basis', () => {
    expect(refusal(() => assertOfferMeetsMinBusiness(rows, 'PER_GUEST', 199))).toMatchObject({
      code: 'BAD_USER_INPUT',
      reason: 'BELOW_MIN_BUSINESS',
      field: 'venue_offer_rate',
      min: 200,
      model: 'PER_GUEST',
    });
    expect(refusal(() => assertOfferMeetsMinBusiness(rows, 'FLAT', null))).toMatchObject({ reason: 'BELOW_MIN_BUSINESS', min: 5000 });
  });

  it('holds back nothing on a basis with no amount, a free ask or a venue that named none', () => {
    expect(() => assertOfferMeetsMinBusiness(rows, 'PER_HOUR', 1)).not.toThrow();
    expect(() => assertOfferMeetsMinBusiness(rows, 'FREE', 0)).not.toThrow();
    expect(() => assertOfferMeetsMinBusiness(undefined, 'PER_GUEST', 1)).not.toThrow();
  });
});
