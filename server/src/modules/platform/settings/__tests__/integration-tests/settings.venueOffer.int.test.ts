/**
 * The platform's defaults for venue booking offers — the fewest guests (8) and
 * the hours to answer (24) — used by every venue that set none of its own.
 */
import { settingsService } from '../../settings.service';
import { AppSettingsModel } from '../../settings.model';

describe('venue booking offer defaults', () => {
  it('are 8 guests and 24 hours on a fresh install', async () => {
    await expect(settingsService.getVenueOfferDefaults()).resolves.toEqual({ min_guests: 8, response_hours: 24 });
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({
      venue_offer_min_guests_default: 8,
      venue_offer_response_hours_default: 24,
    });
  });

  it('are saved by an admin and read back by the offer flow', async () => {
    await settingsService.updateAppSettings({ venue_offer_min_guests_default: 12, venue_offer_response_hours_default: 6 });
    await expect(settingsService.getVenueOfferDefaults()).resolves.toEqual({ min_guests: 12, response_hours: 6 });
  });

  it('are clamped: at least one guest and one hour, at most 1000 guests and 30 days', async () => {
    await settingsService.updateAppSettings({ venue_offer_min_guests_default: 5000, venue_offer_response_hours_default: 9999 });
    await expect(settingsService.getVenueOfferDefaults()).resolves.toEqual({ min_guests: 1000, response_hours: 720 });
    await settingsService.updateAppSettings({ venue_offer_min_guests_default: -3, venue_offer_response_hours_default: -1 });
    await expect(settingsService.getVenueOfferDefaults()).resolves.toEqual({ min_guests: 1, response_hours: 1 });
  });

  it('fall back to the defaults for a value that is not a number', async () => {
    await settingsService.updateAppSettings({
      venue_offer_min_guests_default: 'many' as never,
      venue_offer_response_hours_default: 0,
    });
    await expect(settingsService.getVenueOfferDefaults()).resolves.toEqual({ min_guests: 8, response_hours: 24 });
  });
});

/**
 * Counter offers per booking (Pod Settings): a total split equally between the
 * host and the venue, so it is always even — 6 by default, 3 each.
 */
describe('counter offers per booking', () => {
  it('are 6 in all, 3 for each side, on a fresh install', async () => {
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(3);
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({ venue_offer_max_counters: 6 });
  });

  it('are saved by an admin and split between the two sides', async () => {
    await expect(settingsService.updateAppSettings({ venue_offer_max_counters: 10 })).resolves.toMatchObject({ venue_offer_max_counters: 10 });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(5);
  });

  it('round an odd total down to the even one below it, so the split is always equal', async () => {
    await expect(settingsService.updateAppSettings({ venue_offer_max_counters: 7 })).resolves.toMatchObject({ venue_offer_max_counters: 6 });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(3);
    await settingsService.updateAppSettings({ venue_offer_max_counters: 3 });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(1);
  });

  it.each([
    [1, 2],
    [-3, 2],
    [21, 20],
    [999, 20],
  ])('keep %s within 2 to 20 (saved as %s)', async (input, saved) => {
    await expect(settingsService.updateAppSettings({ venue_offer_max_counters: input })).resolves.toMatchObject({
      venue_offer_max_counters: saved,
    });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(saved / 2);
  });

  it('fall back to the default for 0 or a value that is not a number', async () => {
    await settingsService.updateAppSettings({ venue_offer_max_counters: 0 });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(3);
    await settingsService.updateAppSettings({ venue_offer_max_counters: 'lots' as never });
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({ venue_offer_max_counters: 6 });
  });

  it('read an out-of-range value stored by hand as the nearest allowed total', async () => {
    await AppSettingsModel.collection.updateOne({ singleton_key: 'app' }, { $set: { venue_offer_max_counters: 13 } }, { upsert: true });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(6);
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({ venue_offer_max_counters: 12 });
  });

  it('leave the total alone when an admin saves something else', async () => {
    await settingsService.updateAppSettings({ venue_offer_max_counters: 8 });
    await settingsService.updateAppSettings({ venue_offer_min_guests_default: 4 });
    await expect(settingsService.getVenueOfferCountersPerSide()).resolves.toBe(4);
  });
});
