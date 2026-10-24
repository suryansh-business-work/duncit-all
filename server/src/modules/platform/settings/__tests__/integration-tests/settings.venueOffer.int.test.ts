/**
 * The platform's defaults for venue booking offers — the fewest guests (8) and
 * the hours to answer (24) — used by every venue that set none of its own.
 */
import { settingsService } from '../../settings.service';

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
