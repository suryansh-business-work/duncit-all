jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { CategoryModel } from '@modules/pods/category/category.model';

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

async function seedCategoryTree() {
  const superCat = await CategoryModel.create({ name: 'Sports', slug: 'sports', level: 'SUPER' });
  const category = await CategoryModel.create({
    name: 'Cricket',
    slug: 'cricket',
    level: 'CATEGORY',
    parent_id: superCat._id,
  });
  const subCat = await CategoryModel.create({
    name: 'Box Cricket',
    slug: 'box-cricket',
    level: 'SUB',
    parent_id: category._id,
  });
  return { superCat, category, subCat };
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

  it('stores capacity items (summing the scalar) and a validated category triple', async () => {
    await seedLocation();
    const { superCat, category, subCat } = await seedCategoryTree();
    const owner = new Types.ObjectId().toString();

    const saved = await venueService.submitStep1(owner, {
      city: 'Mumbai',
      venue_name: 'Turf One',
      venue_type: 'Sports Turf',
      capacity: 5,
      capacity_items: [
        { label: 'Turf A', capacity: 12 },
        { label: 'Turf B', capacity: 8 },
      ],
      venue_category: {
        super_category_id: String(superCat._id),
        category_id: String(category._id),
        sub_category_id: String(subCat._id),
      },
    });
    expect(saved.capacity).toBe(20); // sum of items wins over the scalar sent
    expect(saved.capacity_items).toEqual([
      { label: 'Turf A', capacity: 12 },
      { label: 'Turf B', capacity: 8 },
    ]);
    expect(saved.venue_category.super_category_name).toBe('Sports');
    expect(saved.venue_category.sub_category_id).toBe(String(subCat._id));

    // Omitting both fields on a re-save leaves them untouched.
    const resaved = await venueService.submitStep1(owner, { city: 'Mumbai', venue_name: 'Turf One', venue_type: 'Sports Turf', capacity: 99 });
    expect(resaved.capacity_items).toHaveLength(2);
    expect(resaved.venue_category.category_name).toBe('Cricket');
    expect(resaved.capacity).toBe(99);

    // A broken chain (sub not under the chosen category) is rejected.
    await expect(
      venueService.submitStep1(owner, {
        city: 'Mumbai',
        venue_name: 'Turf One',
        venue_type: 'Sports Turf',
        capacity: 5,
        venue_category: {
          super_category_id: String(superCat._id),
          category_id: String(category._id),
          sub_category_id: String(category._id),
        },
      })
    ).rejects.toThrow(/valid sub category/i);

    // Unlabeled or absurd capacity rows are rejected.
    await expect(
      venueService.submitStep1(owner, {
        city: 'Mumbai',
        venue_name: 'Turf One',
        venue_type: 'Sports Turf',
        capacity: 5,
        capacity_items: [{ label: '', capacity: 10 }],
      })
    ).rejects.toThrow(/needs a label/i);
  });

  it('edits a specific venue via venue_id with ownership and status guards', async () => {
    await seedLocation();
    const owner = new Types.ObjectId().toString();
    const first = await venueService.submitStep1(owner, { city: 'Mumbai', venue_name: 'First Cafe', venue_type: 'Cafe', capacity: 10 });
    await venueService.submitStep2(owner, { documents: [{ type: 'GST', url: 'https://doc/gst.pdf' }] }, first.id);
    await venueService.submitStep3(owner, { owner_name: 'Asha', owner_email: 'a@x.com', owner_phone: '+911111111111' }, first.id);
    await venueService.submitFinal(owner, first.id);

    // With the first application submitted, an id-less save opens a NEW draft…
    const second = await venueService.submitStep1(owner, { city: 'Mumbai', venue_name: 'Second Cafe', venue_type: 'Cafe', capacity: 20 });
    expect(second.id).not.toBe(first.id);

    // …while venue_id targets the chosen draft directly.
    const edited = await venueService.submitStep1(owner, { city: 'Mumbai', venue_name: 'Second Cafe v2', venue_type: 'Cafe', capacity: 25 }, second.id);
    expect(edited.id).toBe(second.id);
    expect(edited.venue_name).toBe('Second Cafe v2');

    // getMine honours the explicit id, and hides other users' venues.
    expect((await venueService.getMine(owner, second.id))!.venue_name).toBe('Second Cafe v2');
    expect(await venueService.getMine(new Types.ObjectId().toString(), second.id)).toBeNull();

    // Submitted venues are not editable; foreign venues are forbidden.
    await expect(
      venueService.submitStep1(owner, { city: 'Mumbai', venue_name: 'Hack', venue_type: 'Cafe', capacity: 1 }, first.id)
    ).rejects.toThrow(/no longer editable/i);
    await expect(
      venueService.submitStep1(new Types.ObjectId().toString(), { city: 'Mumbai', venue_name: 'Hack', venue_type: 'Cafe', capacity: 1 }, second.id)
    ).rejects.toThrow(/not your venue/i);
  });

  it('exposes the registration option catalogs', () => {
    const config = venueService.registrationConfig();
    expect(config.venue_types).toContain('Cafe');
    expect(config.doc_types).toContain('GST Certificate');
    expect(config.capacity_item_limit).toBeGreaterThan(0);
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
    expect(updated.settings.rules.max_advance_days).toBe(60); // clamped to the 60-day max
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

  it('hides deactivated venues from an activeOnly list only', async () => {
    const owner = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: owner, venue_name: 'On', status: 'APPROVED', is_active: true });
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Off', status: 'APPROVED', is_active: false });

    const all = await venueService.list({ status: 'APPROVED' });
    expect(all).toHaveLength(2);

    const activeOnly = await venueService.list({ status: 'APPROVED', activeOnly: true });
    expect(activeOnly.map((v) => v.venue_name)).toEqual(['On']);
  });

  it('blocks venue delete while a pod or booked slot references it, then cascades slots when clean', async () => {
    const owner = new Types.ObjectId();
    const venue = await VenueModel.create({ owner_user_id: owner, venue_name: 'Del', status: 'APPROVED' });
    const vid = String(venue._id);

    // A live pod blocks the delete.
    const pod = await PodModel.create({
      pod_id: 'p1', pod_title: 'P', pod_hosts_id: [owner], club_id: new Types.ObjectId(),
      venue_id: venue._id, pod_description: 'd', pod_date_time: new Date(), pod_type: 'NATIVE_FREE',
    });
    await expect(venueService.deleteVenue(vid)).rejects.toThrow(/pod\(s\) attached/i);

    // Soft-delete the pod; a BOOKED slot still blocks.
    await PodModel.updateOne({ _id: pod._id }, { deleted_at: new Date() });
    const slot = await VenueSlotModel.create({
      venue_id: venue._id, owner_user_id: owner, start_at: new Date(), end_at: new Date(Date.now() + 3_600_000),
      status: 'BOOKED', booked_by_pod_id: pod._id,
    });
    await expect(venueService.deleteVenue(vid)).rejects.toThrow(/booked slot/i);

    // Free the slot → delete succeeds and cascades the now-unbooked slot.
    await VenueSlotModel.updateOne({ _id: slot._id }, { status: 'AVAILABLE', booked_by_pod_id: null });
    expect(await venueService.deleteVenue(vid)).toBe(true);
    expect(await VenueModel.findById(vid)).toBeNull();
    expect(await VenueSlotModel.countDocuments({ venue_id: venue._id })).toBe(0);
  });
});

describe('venuesTable / myVenuesTable (shared table engine)', () => {
  it('serves the admin venuesTable page with search, filters, sort and paging', async () => {
    const owner = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Alpha Cafe', venue_type: 'CAFE', city: 'Mumbai', capacity: 40, status: 'APPROVED' });
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Beta Turf', venue_type: 'TURF', city: 'Pune', capacity: 80, status: 'SUBMITTED' });
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Gamma Hall', venue_type: 'BANQUET', city: 'Mumbai', capacity: 120, status: 'APPROVED', is_active: false });

    // Plain envelope: newest-first default (mirrors list()) + clamp defaults.
    const all = await venueService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((v) => v.venue_name)).toEqual(['Gamma Hall', 'Beta Turf', 'Alpha Cafe']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans venue_name / venue_type / city / locality / owner fields.
    const byCity = await venueService.table({ search: 'pune' });
    expect(byCity.rows.map((v) => v.venue_name)).toEqual(['Beta Turf']);
    expect(byCity.total).toBe(1);

    // Enum + boolean filters narrow.
    const approved = await venueService.table({ filters: [{ field: 'status', op: 'eq', value: 'APPROVED' }] });
    expect(approved.rows.map((v) => v.venue_name)).toEqual(['Gamma Hall', 'Alpha Cafe']);
    const active = await venueService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((v) => v.venue_name)).toEqual(['Beta Turf', 'Alpha Cafe']);

    // Allowlisted sort, then paging keeps total and echoes the clamped page.
    const byCapacity = await venueService.table({ sort_by: 'capacity', sort_dir: 'asc' });
    expect(byCapacity.rows.map((v) => v.capacity)).toEqual([40, 80, 120]);
    const page2 = await venueService.table({ sort_by: 'venue_name', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((v) => v.venue_name)).toEqual(['Beta Turf']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('scopes myVenuesTable to the caller — user A can never see user B rows', async () => {
    const ownerA = new Types.ObjectId();
    const ownerB = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: ownerA, venue_name: 'A One', city: 'Mumbai' });
    await VenueModel.create({ owner_user_id: ownerA, venue_name: 'A Two', city: 'Pune' });
    await VenueModel.create({ owner_user_id: ownerB, venue_name: 'B Secret', city: 'Mumbai' });

    // Owner default sort is recently-updated (mirrors listMine()).
    const mine = await venueService.tableMine(String(ownerA));
    expect(mine.total).toBe(2);
    expect(mine.rows.map((v) => v.venue_name)).toEqual(['A Two', 'A One']);

    // Client search/filters $and-merge with the owner scope — they can narrow
    // it but never widen it to another owner's venues.
    const filtered = await venueService.tableMine(String(ownerA), {
      search: 'secret',
      filters: [{ field: 'city', op: 'eq', value: 'Mumbai' }],
    });
    expect(filtered.total).toBe(0);
    expect(filtered.rows).toEqual([]);

    const other = await venueService.tableMine(String(ownerB));
    expect(other.rows.map((v) => v.venue_name)).toEqual(['B Secret']);
    expect(other.total).toBe(1);
  });
});
