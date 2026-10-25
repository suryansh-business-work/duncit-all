/**
 * A venue's own terms for booking offers — the fewest guests and the hours to
 * answer — with 0 meaning "the platform's default", read once per request.
 */
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getVenueOfferDefaults: jest.fn() },
}));

import { settingsService } from '@modules/platform/settings/settings.service';
import {
  VENUE_OFFER_SETTINGS_MAX,
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
    expect(toOfferSettingsPub(undefined)).toEqual({ min_guests: 0, response_hours: 0 });
    expect(toOfferSettingsPub(null)).toEqual({ min_guests: 0, response_hours: 0 });
    expect(toOfferSettingsPub({})).toEqual({ min_guests: 0, response_hours: 0 });
  });

  it('keeps whole values and clamps the out-of-range ones', () => {
    expect(toOfferSettingsPub({ min_guests: 12.6, response_hours: 48 })).toEqual({ min_guests: 12, response_hours: 48 });
    expect(toOfferSettingsPub({ min_guests: -5, response_hours: 99_999 })).toEqual({
      min_guests: 0,
      response_hours: VENUE_OFFER_SETTINGS_MAX.responseHours,
    });
  });
});

describe('normalizeOfferSettingsInput', () => {
  const base = { min_guests: 10, response_hours: 6 };

  it('changes only what the edit names', () => {
    expect(normalizeOfferSettingsInput(base, { min_guests: 4 })).toEqual({ min_guests: 4, response_hours: 6 });
    expect(normalizeOfferSettingsInput(base, { response_hours: 72 })).toEqual({ min_guests: 10, response_hours: 72 });
    expect(normalizeOfferSettingsInput(base, { min_guests: null, response_hours: undefined })).toEqual(base);
  });

  it('clamps an out-of-range edit and keeps the stored value for one that is not a number', () => {
    expect(normalizeOfferSettingsInput(base, { min_guests: 5000, response_hours: -1 })).toEqual({
      min_guests: VENUE_OFFER_SETTINGS_MAX.minGuests,
      response_hours: 0,
    });
    expect(normalizeOfferSettingsInput(base, { min_guests: 'lots', response_hours: 'soon' })).toEqual(base);
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
