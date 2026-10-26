/**
 * A venue's own booking-offer terms (Partners > Venue settings > Booking
 * offers): saved by its owner or staff, clamped, and resolved on every Venue
 * as the effective minimum and response time — the venue's own, else the
 * platform's default.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { venueService } from '../../venue.service';
import { venueResolvers } from '../../venue.resolver';
import { VenueModel } from '../../venue.model';
import { settingsService } from '@modules/platform/settings/settings.service';

const ownerId = new Types.ObjectId().toString();

async function seedVenue(settings: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({ owner_user_id: ownerId, status: 'APPROVED', is_active: true, venue_name: 'Loft', settings });
  return String(venue._id);
}

const {
  offer_min_guests: minGuests,
  offer_response_hours: responseHours,
  offer_min_business: minBusiness,
} = venueResolvers.Venue;

describe('saving booking-offer settings', () => {
  it('starts every venue on the platform defaults (0), with no business amounts', async () => {
    const id = await seedVenue();
    const venue = await venueService.updateSettings(ownerId, false, id, {});
    expect(venue.settings.offers).toEqual({ min_guests: 0, response_hours: 0, min_business: [] });
  });

  it("saves the owner's minimum and response time, clamped, leaving the rest of the settings as they were", async () => {
    const id = await seedVenue({ weekly_off_days: [1] });
    const venue = await venueService.updateSettings(ownerId, false, id, { offers: { min_guests: 10, response_hours: 6 } });
    expect(venue.settings.offers).toEqual({ min_guests: 10, response_hours: 6, min_business: [] });
    expect(venue.settings.weekly_off_days).toEqual([1]);

    const clamped = await venueService.updateSettings(ownerId, false, id, { offers: { min_guests: 99_999, response_hours: -5 } });
    expect(clamped.settings.offers).toEqual({ min_guests: 1000, response_hours: 0, min_business: [] });

    const partial = await venueService.updateSettings(ownerId, false, id, { offers: { response_hours: 48 } });
    expect(partial.settings.offers).toEqual({ min_guests: 1000, response_hours: 48, min_business: [] });
  });

  it('saves the business the venue hopes for, keeps it through an edit that leaves it out, and reads it back', async () => {
    const id = await seedVenue();
    const saved = await venueService.updateSettings(ownerId, false, id, {
      offers: { min_business: [{ model: 'FLAT', amount: 12_000 }, { model: 'PER_GUEST', amount: 450.456 }] },
    });
    const amounts = [
      { model: 'PER_GUEST', amount: 450.46 },
      { model: 'FLAT', amount: 12_000 },
    ];
    expect(saved.settings.offers.min_business).toEqual(amounts);

    const edited = await venueService.updateSettings(ownerId, false, id, { offers: { min_guests: 5 } });
    expect(edited.settings.offers).toEqual({ min_guests: 5, response_hours: 0, min_business: amounts });
    const stored = await VenueModel.findById(id).lean();
    expect(stored?.settings?.offers?.min_business).toEqual(amounts);
  });

  it('refuses amounts that are not sound and leaves what was stored', async () => {
    const id = await seedVenue({ offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_HOUR', amount: 300 }] } });
    await expect(
      venueService.updateSettings(ownerId, false, id, { offers: { min_business: [{ model: 'PER_HOUR', amount: 0 }] } })
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT', field: 'min_business' } });
    await expect(venueService.updateSettings(ownerId, false, id, { offers: { min_business: [] } })).rejects.toThrow(
      'Add the business you expect from at least one booking type'
    );
    const stored = await VenueModel.findById(id).lean();
    expect(stored?.settings?.offers?.min_business).toEqual([{ model: 'PER_HOUR', amount: 300 }]);
  });

  it('lets staff save them for any venue, and nobody else', async () => {
    const id = await seedVenue();
    const staff = await venueService.updateSettings(String(new Types.ObjectId()), true, id, { offers: { min_guests: 4 } });
    expect(staff.settings.offers.min_guests).toBe(4);
    await expect(venueService.updateSettings(String(new Types.ObjectId()), false, id, { offers: { min_guests: 2 } })).rejects.toThrow(
      'Not your venue'
    );
  });
});

describe('the effective terms on a Venue', () => {
  it("are the venue's own, else the platform's", async () => {
    await settingsService.updateAppSettings({ venue_offer_min_guests_default: 7, venue_offer_response_hours_default: 36 });
    const ctx = makeContext({ id: ownerId });
    const own = { settings: { offers: { min_guests: 3, response_hours: 0 } } };
    await expect(minGuests(own, {}, ctx)).resolves.toBe(3);
    await expect(responseHours(own, {}, ctx)).resolves.toBe(36);
    // A shaped venue without settings reads the platform's.
    await expect(minGuests({}, {}, ctx)).resolves.toBe(7);
  });

  it('carry the business the venue hopes for as a guide, and none for a venue that set none', () => {
    const own = { settings: { offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_HOUR' as const, amount: 800 }] } } };
    expect(minBusiness(own)).toEqual([{ model: 'PER_HOUR', amount: 800 }]);
    expect(minBusiness({})).toEqual([]);
  });
});
