jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { LocationModel } from '@modules/platform/location/location.model';

const userId = new Types.ObjectId().toString();

async function seedLocation() {
  return LocationModel.create({
    location_id: 'mumbai',
    location_name: 'Mumbai',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Mumbai',
    location_image: 'https://img/m.jpg',
    location_pincode: '400001',
    location_zones: [],
  });
}

describe('venueService integration', () => {
  it('returns null/empty when the user has no venue', async () => {
    expect(await venueService.getMine(userId)).toBeNull();
    expect(await venueService.list()).toEqual([]);
  });

  it('walks the multi-step registration flow to SUBMITTED', async () => {
    await seedLocation();
    const s1 = await venueService.submitStep1(userId, { city: 'Mumbai', venue_name: 'Cafe X', venue_type: 'CAFE', capacity: 40 });
    expect(s1.step_completed).toBe(1);
    expect(s1.venue_name).toBe('Cafe X');

    const s2 = await venueService.submitStep2(userId, { documents: [{ type: 'GST', url: 'https://doc/gst.pdf' }], gstin: '22AAAAA0000A1Z5' });
    expect(s2.step_completed).toBe(2);

    const s3 = await venueService.submitStep3(userId, { owner_name: 'Asha', owner_email: 'asha@x.com', owner_phone: '+919999999999' });
    expect(s3.step_completed).toBe(3);

    const fin = await venueService.submitFinal(userId);
    expect(fin.status).toBe('SUBMITTED');
    expect(fin.step_completed).toBe(4);
  });

  it('enforces step ordering and known locations', async () => {
    const fresh = new Types.ObjectId().toString();
    await expect(venueService.submitStep2(fresh, { documents: [] })).rejects.toThrow(/complete venue details first/i);
    await expect(
      venueService.submitStep1(fresh, { city: 'Atlantis', venue_name: 'Ghost' })
    ).rejects.toThrow(/location was not found/i);
  });

  it('defaults venue settings and updates hours/weekly-off/holidays/rules', async () => {
    const v = await VenueModel.create({ owner_user_id: userId, venue_name: 'Settings Cafe' });
    const id = String(v._id);

    // Defaults are surfaced even though the doc predates the settings field.
    const fresh = await venueService.getById(id);
    expect(fresh!.settings.operating_hours).toEqual({ open: '09:00', close: '23:00' });
    expect(fresh!.settings.rules.max_advance_days).toBe(60);
    expect(fresh!.settings.rules.max_bookings_per_slot).toBe(1);

    const updated = await venueService.updateSettings(userId, false, id, {
      operating_hours: { open: '08:00', close: '22:30' },
      weekly_off_days: [0, 6, 6],
      holidays: ['2026-08-15', '2026-01-26'],
      rules: { buffer_minutes: 15, max_bookings_per_slot: 10, allow_waitlist: true, max_advance_days: 5000 },
    });
    expect(updated.settings.operating_hours).toEqual({ open: '08:00', close: '22:30' });
    expect(updated.settings.weekly_off_days).toEqual([0, 6]); // deduped + sorted
    expect(updated.settings.holidays).toEqual(['2026-01-26', '2026-08-15']); // sorted
    expect(updated.settings.rules.buffer_minutes).toBe(15);
    expect(updated.settings.rules.max_bookings_per_slot).toBe(10);
    expect(updated.settings.rules.allow_waitlist).toBe(true);
    expect(updated.settings.rules.max_advance_days).toBe(365); // clamped to max
  });

  it('validates settings input and guards ownership', async () => {
    const v = await VenueModel.create({ owner_user_id: userId, venue_name: 'Guard Cafe' });
    const id = String(v._id);

    await expect(
      venueService.updateSettings(userId, false, id, { operating_hours: { open: '25:00', close: '26:00' } })
    ).rejects.toThrow(/HH:mm/i);
    await expect(
      venueService.updateSettings(userId, false, id, { operating_hours: { open: '20:00', close: '09:00' } })
    ).rejects.toThrow(/before closing/i);
    await expect(
      venueService.updateSettings(userId, false, id, { weekly_off_days: [9] })
    ).rejects.toThrow(/0\.\.6/);
    await expect(
      venueService.updateSettings(userId, false, id, { holidays: ['15-08-2026'] })
    ).rejects.toThrow(/YYYY-MM-DD/);

    // A non-owner, non-admin cannot edit; an admin can.
    await expect(
      venueService.updateSettings(new Types.ObjectId().toString(), false, id, { weekly_off_days: [0] })
    ).rejects.toThrow(/not your venue/i);
    const byAdmin = await venueService.updateSettings(new Types.ObjectId().toString(), true, id, {
      weekly_off_days: [1],
    });
    expect(byAdmin.settings.weekly_off_days).toEqual([1]);
  });

  it('rejects, toggles active and deletes a venue', async () => {
    const v = await VenueModel.create({ owner_user_id: userId, owner_email: 'o@x.com', venue_name: 'Cafe' });
    const id = String(v._id);

    const rejected = await venueService.reject(id, 'Missing docs');
    expect(rejected.status).toBe('REJECTED');

    const off = await venueService.setActive(id, false);
    expect(off.is_active).toBe(false);

    expect(await venueService.deleteVenue(id)).toBe(true);
    expect(await VenueModel.countDocuments()).toBe(0);
  });
});
