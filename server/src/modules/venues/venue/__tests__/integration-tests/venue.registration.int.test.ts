/**
 * Venue registration edges, settings normalisation, club matching and the
 * public redaction, against a real database. Complements venue.int.test.ts,
 * which walks the happy registration path.
 */
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/venues/autoExtend/autoExtend.service', () => ({
  autoExtendService: { runForVenue: jest.fn().mockResolvedValue(undefined) },
}));

import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { autoExtendService } from '@modules/venues/autoExtend/autoExtend.service';

const runForVenue = autoExtendService.runForVenue as jest.Mock;
const flush = () => new Promise((r) => setImmediate(r));

async function seedLocation(over: Record<string, unknown> = {}) {
  return LocationModel.create({
    location_id: `loc-${new Types.ObjectId()}`,
    location_name: 'Bengaluru',
    country: 'India',
    country_code: 'IN',
    state: 'Karnataka',
    state_code: 'KA',
    city: 'Bengaluru',
    location_image: 'https://img.example.test/blr.jpg',
    location_pincode: '560001',
    location_zones: [
      { zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
      { zone_name: 'Whitefield', zone_code: 'WFD', pincode: '' },
    ],
    ...over,
  });
}

const newOwner = () => String(new Types.ObjectId());

describe('step 1 — location', () => {
  it('a city with localities requires one', async () => {
    await seedLocation();
    await expect(venueService.submitStep1(newOwner(), { city: 'Bengaluru', venue_name: 'X' })).rejects.toThrow(
      'Select a locality for this city'
    );
  });

  it('refuses a locality the city does not have', async () => {
    await seedLocation();
    await expect(
      venueService.submitStep1(newOwner(), { city: 'Bengaluru', locality: 'Atlantis', venue_name: 'X' })
    ).rejects.toThrow('Selected locality is not available for this city');
  });

  it('matches a locality by zone code and takes its name and pincode', async () => {
    const loc = await seedLocation();
    const out = await venueService.submitStep1(newOwner(), {
      location_id: String(loc._id),
      locality: 'IND',
      venue_name: 'Cafe',
    });
    expect(out).toMatchObject({
      location_id: String(loc._id),
      city: 'Bengaluru',
      state: 'Karnataka',
      state_code: 'KA',
      country_code: 'IN',
      locality: 'Indiranagar',
      postal_code: '560038',
    });
  });

  it("a zone without a pincode falls back to the city's", async () => {
    await seedLocation();
    const out = await venueService.submitStep1(newOwner(), {
      city: ' bengaluru ',
      state: 'karnataka',
      country_code: 'IN',
      locality: 'Whitefield',
    });
    expect(out).toMatchObject({ locality: 'Whitefield', postal_code: '560001' });
  });

  it('the city lookup honours state and country, and falls back to location_name', async () => {
    await seedLocation({ city: '', location_name: 'Mysuru', location_zones: [] });
    await expect(
      venueService.submitStep1(newOwner(), { city: 'Mysuru', state: 'Goa' })
    ).rejects.toThrow('Selected location was not found');
    await expect(
      venueService.submitStep1(newOwner(), { city: 'Mysuru', country_code: 'US' })
    ).rejects.toThrow('Selected location was not found');

    const out = await venueService.submitStep1(newOwner(), { city: 'Mysuru', state: 'Karnataka' });
    expect(out).toMatchObject({ city: 'Mysuru', locality: 'Mysuru', postal_code: '560001' });
  });

  it('a blank city and no location id is not a location', async () => {
    await expect(venueService.submitStep1(newOwner(), { city: '   ' })).rejects.toThrow(
      'Selected location was not found'
    );
  });
});

describe('step 1 — capacity list', () => {
  let locId: string;
  beforeEach(async () => {
    locId = String((await seedLocation({ location_zones: [] }))._id);
  });

  it(`refuses more than the capacity entry limit`, async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ label: `Room ${i}`, capacity: 2 }));
    await expect(venueService.submitStep1(newOwner(), { location_id: locId, capacity_items: items })).rejects.toThrow(
      'At most 50 capacity entries are allowed'
    );
  });

  it('refuses a label over 80 characters and a capacity outside 1..100000', async () => {
    await expect(
      venueService.submitStep1(newOwner(), {
        location_id: locId,
        capacity_items: [{ label: 'x'.repeat(81), capacity: 2 }],
      })
    ).rejects.toThrow('Capacity labels must be 80 characters or fewer');
    await expect(
      venueService.submitStep1(newOwner(), { location_id: locId, capacity_items: [{ label: 'Deck', capacity: 0 }] })
    ).rejects.toThrow('Enter a capacity between 1 and 100000 for "Deck"');
    await expect(
      venueService.submitStep1(newOwner(), {
        location_id: locId,
        capacity_items: [{ label: 'Deck', capacity: 100001 }],
      })
    ).rejects.toThrow('Enter a capacity between 1 and 100000 for "Deck"');
    await expect(
      venueService.submitStep1(newOwner(), { location_id: locId, capacity_items: [{ label: 'Deck', capacity: 'lots' }] })
    ).rejects.toThrow('Enter a capacity between 1 and 100000 for "Deck"');
  });

  it('drops fully blank rows, truncates capacities, and an empty list keeps the scalar', async () => {
    const owner = newOwner();
    const out = await venueService.submitStep1(owner, {
      location_id: locId,
      capacity: 7,
      capacity_items: [{ label: '  Hall  ', capacity: 10.9 }, { label: '', capacity: 'x' }, null],
    });
    expect(out.capacity_items).toEqual([{ label: 'Hall', capacity: 10 }]);
    expect(out.capacity).toBe(10);

    const cleared = await venueService.submitStep1(owner, { location_id: locId, capacity: 7, capacity_items: [] });
    expect(cleared.capacity_items).toEqual([]);
    expect(cleared.capacity).toBe(7);
  });
});

describe('step 1 — category triple', () => {
  let locId: string;
  let superCat: any;
  let category: any;
  let subCat: any;
  beforeEach(async () => {
    locId = String((await seedLocation({ location_zones: [] }))._id);
    superCat = await CategoryModel.create({ name: 'Sports', slug: 'sports', level: 'SUPER' });
    category = await CategoryModel.create({ name: 'Racquet', slug: 'racquet', level: 'CATEGORY', parent_id: superCat._id });
    subCat = await CategoryModel.create({ name: 'Padel', slug: 'padel', level: 'SUB', parent_id: category._id });
  });

  const submit = (triple: Record<string, unknown>) =>
    venueService.submitStep1(newOwner(), { location_id: locId, venue_category: triple });

  it('refuses ids that are not ids', async () => {
    await expect(
      submit({ super_category_id: 'x', category_id: String(category._id), sub_category_id: String(subCat._id) })
    ).rejects.toThrow('Venue category selection is invalid');
  });

  it('refuses a super that is not a SUPER, and a category under another super', async () => {
    await expect(
      submit({
        super_category_id: String(category._id),
        category_id: String(category._id),
        sub_category_id: String(subCat._id),
      })
    ).rejects.toThrow('Select a valid super category');

    const otherSuper = await CategoryModel.create({ name: 'Pets', slug: 'pets', level: 'SUPER' });
    await expect(
      submit({
        super_category_id: String(otherSuper._id),
        category_id: String(category._id),
        sub_category_id: String(subCat._id),
      })
    ).rejects.toThrow('Select a valid category under the chosen super category');

    await expect(
      submit({ super_category_id: String(superCat._id), category_id: missing(), sub_category_id: String(subCat._id) })
    ).rejects.toThrow('Select a valid category under the chosen super category');
  });

  it('a null category leaves the stored one alone', async () => {
    const owner = newOwner();
    await venueService.submitStep1(owner, {
      location_id: locId,
      venue_category: {
        super_category_id: String(superCat._id),
        category_id: String(category._id),
        sub_category_id: String(subCat._id),
      },
    });
    const out = await venueService.submitStep1(owner, { location_id: locId, venue_category: null });
    expect(out.venue_category).toEqual({
      super_category_id: String(superCat._id),
      category_id: String(category._id),
      sub_category_id: String(subCat._id),
      super_category_name: 'Sports',
      category_name: 'Racquet',
      sub_category_name: 'Padel',
    });
  });
});

const missing = () => String(new Types.ObjectId());

describe('registration steps — guards and owner details', () => {
  it('refuses a malformed or unknown venue id', async () => {
    await expect(venueService.submitStep2(newOwner(), {}, 'nope')).rejects.toThrow('Invalid venue id');
    await expect(venueService.submitStep2(newOwner(), {}, missing())).rejects.toThrow('Venue not found');
  });

  it('step 3 needs step 2, and the final submit needs step 3', async () => {
    const owner = newOwner();
    const v = await VenueModel.create({ owner_user_id: owner, step_completed: 1 });
    await expect(venueService.submitStep3(owner, {}, String(v._id))).rejects.toThrow(
      'Complete documentation step first'
    );
    await VenueModel.updateOne({ _id: v._id }, { $set: { step_completed: 2 } });
    await expect(venueService.submitFinal(owner, String(v._id))).rejects.toThrow('Complete all steps first');
  });

  it('step 3 stores the DOB, address and a normalised bank account', async () => {
    const owner = newOwner();
    const v = await VenueModel.create({ owner_user_id: owner, step_completed: 2 });
    const out = await venueService.submitStep3(
      owner,
      {
        owner_name: 'Asha',
        owner_email: 'asha@example.com',
        owner_phone: '+910000000000',
        owner_dob: '1991-04-05',
        owner_address: '12 Lake Rd',
        bank_account: { payout_method: 'imps', account_number: ' 0001 ', ifsc_code: 'hdfc0000001' },
      },
      String(v._id)
    );
    expect(out).toMatchObject({
      owner_dob: new Date('1991-04-05').toISOString(),
      owner_address: '12 Lake Rd',
      step_completed: 3,
      bank_account: { payout_method: 'IMPS', account_number: '0001', ifsc_code: 'HDFC0000001' },
    });
  });

  it('re-saving step 1 of a REJECTED application reopens it as a DRAFT, keeping its step', async () => {
    const loc = await seedLocation({ location_zones: [] });
    const owner = newOwner();
    const v = await VenueModel.create({ owner_user_id: owner, status: 'REJECTED', step_completed: 3 });

    const out = await venueService.submitStep1(owner, { location_id: String(loc._id) }, String(v._id));

    expect(out).toMatchObject({ id: String(v._id), status: 'DRAFT', step_completed: 3 });
  });

  it('step 2 replaces the documents and keeps GSTIN/PAN when not sent', async () => {
    const owner = newOwner();
    const v = await VenueModel.create({ owner_user_id: owner, step_completed: 3, gstin: 'G', pan: 'P' });
    const out = await venueService.submitStep2(owner, { documents: [{ type: 'PAN', url: 'https://doc.example.test/p.pdf' }] }, String(v._id));
    expect(out).toMatchObject({ gstin: 'G', pan: 'P', step_completed: 3 });
    expect(out.documents.map((d: any) => d.type)).toEqual(['PAN']);

    const none = await venueService.submitStep2(owner, {}, String(v._id));
    expect(none.documents).toEqual([]);
  });
});

describe('getMine / listMine', () => {
  it('prefers the open application over an approved venue, then falls back to the newest venue', async () => {
    const owner = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Live', status: 'APPROVED' });
    const pending = await VenueModel.create({ owner_user_id: owner, venue_name: 'Pending', status: 'SUBMITTED' });

    expect((await venueService.getMine(String(owner)))?.venue_name).toBe('Pending');

    await VenueModel.deleteOne({ _id: pending._id });
    expect((await venueService.getMine(String(owner)))?.venue_name).toBe('Live');
  });

  it('refuses a malformed explicit id, and answers null for an unknown one', async () => {
    await expect(venueService.getMine(newOwner(), 'bad')).rejects.toThrow('Invalid venue id');
    await expect(venueService.getMine(newOwner(), missing())).resolves.toBeNull();
  });

  it("lists only the caller's venues", async () => {
    const owner = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Mine A' });
    await VenueModel.create({ owner_user_id: owner, venue_name: 'Mine B' });
    await VenueModel.create({ owner_user_id: new Types.ObjectId(), venue_name: 'Theirs' });

    const mine = await venueService.listMine(String(owner));
    expect(mine.map((v) => v.venue_name).sort()).toEqual(['Mine A', 'Mine B']);
  });

  it('getById answers null for an unknown venue', async () => {
    await expect(venueService.getById(missing())).resolves.toBeNull();
  });
});

describe('updateSettings — cancellation and auto-extend', () => {
  const owner = String(new Types.ObjectId());
  const makeVenue = async () => String((await VenueModel.create({ owner_user_id: owner }))._id);

  it('refuses a malformed or unknown venue', async () => {
    await expect(venueService.updateSettings(owner, true, 'x', {})).rejects.toThrow('Invalid venue id');
    await expect(venueService.updateSettings(owner, true, missing(), {})).rejects.toThrow('Venue not found');
  });

  it('stores charge bands widest-first, clamps the trigger and keeps the refund ladder valid', async () => {
    const id = await makeVenue();
    const out = await venueService.updateSettings(owner, false, id, {
      cancellation: {
        reschedule_only: 1,
        trigger_hours: 99999,
        tiers: [
          { hours_before: 2, charge_type: 'PERCENT', value: 100 },
          { hours_before: 48, charge_type: 'AMOUNT', value: 250 },
        ],
        refund_tiers: [
          { hours_before: 12, refund_pct: 50 },
          { hours_before: 72, refund_pct: 100 },
        ],
      },
    });
    expect(out.settings.cancellation).toEqual({
      reschedule_only: true,
      trigger_hours: 8760,
      tiers: [
        { hours_before: 48, charge_type: 'AMOUNT', value: 250 },
        { hours_before: 2, charge_type: 'PERCENT', value: 100 },
      ],
      refund_tiers: [
        { hours_before: 72, refund_pct: 100 },
        { hours_before: 12, refund_pct: 50 },
      ],
    });

    // A later partial save keeps what it was not given.
    const partial = await venueService.updateSettings(owner, false, id, { cancellation: { reschedule_only: false } });
    expect(partial.settings.cancellation.tiers).toHaveLength(2);
    expect(partial.settings.cancellation.trigger_hours).toBe(8760);
    expect(partial.settings.cancellation.reschedule_only).toBe(false);
  });

  it('refuses an unknown charge kind, a percent over 100, a negative amount and duplicate windows', async () => {
    const id = await makeVenue();
    const tiers = (t: unknown[]) => venueService.updateSettings(owner, false, id, { cancellation: { tiers: t } });

    await expect(tiers([{ hours_before: 1, charge_type: 'FREE', value: 0 }])).rejects.toThrow(
      'cancellation charge_type must be PERCENT or AMOUNT'
    );
    await expect(tiers([{ hours_before: 1, charge_type: 'PERCENT', value: 101 }])).rejects.toThrow(
      'cancellation charge must be between 0 and 100'
    );
    await expect(tiers([{ hours_before: 1, charge_type: 'AMOUNT', value: -1 }])).rejects.toThrow(
      'cancellation charge must be between 0 and 1000000'
    );
    await expect(
      tiers([
        { hours_before: 6, charge_type: 'AMOUNT', value: 10 },
        { hours_before: 6, charge_type: 'PERCENT', value: 10 },
      ])
    ).rejects.toThrow('each cancellation band needs its own "hours before" window');
  });

  it('validates the auto-extend template id and stop date', async () => {
    const id = await makeVenue();
    await expect(
      venueService.updateSettings(owner, false, id, { auto_extend: { template_id: 'nope' } })
    ).rejects.toThrow('auto_extend.template_id must be a valid id');
    await expect(
      venueService.updateSettings(owner, false, id, { auto_extend: { until: '31-12-2026' } })
    ).rejects.toThrow('auto_extend.until must be YYYY-MM-DD');
  });

  it('caps the horizon at the booking window, and switching it on tops up straight away', async () => {
    const id = await makeVenue();
    const template = String(new Types.ObjectId());

    const out = await venueService.updateSettings(owner, false, id, {
      rules: { max_advance_days: 20 },
      auto_extend: { enabled: true, horizon_days: 400, template_id: template, until: ' 2026-12-31 ' },
    });
    await flush();

    expect(out.settings.auto_extend).toEqual({
      enabled: true,
      template_id: template,
      horizon_days: 20,
      until: '2026-12-31',
    });
    expect(runForVenue).toHaveBeenCalledWith(id);

    const cleared = await venueService.updateSettings(owner, false, id, {
      auto_extend: { enabled: false, template_id: '  ', until: '' },
    });
    await flush();
    expect(cleared.settings.auto_extend).toMatchObject({ enabled: false, template_id: null, until: '' });
    expect(runForVenue).toHaveBeenCalledTimes(1);
  });

  it('a failed top-up never fails the settings save', async () => {
    const id = await makeVenue();
    runForVenue.mockRejectedValueOnce(new Error('generator down'));

    await expect(
      venueService.updateSettings(owner, false, id, { auto_extend: { enabled: true, template_id: null } })
    ).resolves.toMatchObject({ settings: { auto_extend: { enabled: true, template_id: null } } });
    await flush();
  });

  it('rules: unset values keep their current value, numbers are clamped, flags coerced', async () => {
    const id = await makeVenue();
    const out = await venueService.updateSettings(owner, false, id, {
      rules: {
        buffer_minutes: 5000,
        min_notice_minutes: -5,
        max_bookings_per_slot: 'abc',
        allow_instant_booking: 0,
        booking_approval_required: 'yes',
        max_host_requests_per_month: 500,
      },
    });
    expect(out.settings.rules).toEqual({
      buffer_minutes: 1440,
      min_notice_minutes: 0,
      max_advance_days: 60,
      max_bookings_per_slot: 1,
      allow_instant_booking: false,
      allow_waitlist: false,
      booking_approval_required: true,
      allow_multiple_bookings: false,
      max_host_requests_per_month: 100,
    });
  });
});

describe('club matching', () => {
  const loc = new Types.ObjectId();
  const superCat = new Types.ObjectId();
  const sub = new Types.ObjectId();

  beforeEach(async () => {
    const live = { owner_user_id: new Types.ObjectId(), status: 'APPROVED', is_active: true, location_id: loc };
    await VenueModel.create({
      ...live,
      venue_name: 'Bravo',
      locality: 'Indiranagar',
      venue_category: { super_category_id: superCat, sub_category_id: sub },
    });
    await VenueModel.create({ ...live, venue_name: 'Alpha', locality: 'Indiranagar', venue_category: { super_category_id: superCat } });
    await VenueModel.create({ ...live, venue_name: 'Charlie', locality: 'Whitefield' });
    await VenueModel.create({ ...live, venue_name: 'Paused', is_active: false });
    await VenueModel.create({ ...live, venue_name: 'Pending', status: 'SUBMITTED' });
    await VenueModel.create({ ...live, venue_name: 'Elsewhere', location_id: new Types.ObjectId() });
  });

  it('a club with no usable location matches nothing', async () => {
    for (const location_id of [null, undefined, 'nope']) {
      await expect(venueService.findMatchingForClub({ location_id })).resolves.toEqual([]);
      await expect(venueService.countMatchingForClub({ location_id })).resolves.toBe(0);
      await expect(venueService.matchingIdsForClub({ location_id })).resolves.toEqual([]);
    }
  });

  it('city level: every approved, active venue in the location, by name', async () => {
    const rows = await venueService.findMatchingForClub({ location_id: String(loc), locality: '  ' });
    expect(rows.map((v) => v.venue_name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await expect(venueService.countMatchingForClub({ location_id: String(loc) })).resolves.toBe(3);
    const ids = await venueService.matchingIdsForClub({ location_id: String(loc) });
    expect(ids.sort()).toEqual(rows.map((v) => v.id).sort());
  });

  it('a locality narrows, and the Super + Sub narrow further; unusable ids are ignored', async () => {
    const inLocality = await venueService.findMatchingForClub({ location_id: String(loc), locality: ' Indiranagar ' });
    expect(inLocality.map((v) => v.venue_name)).toEqual(['Alpha', 'Bravo']);

    const bySuper = await venueService.countMatchingForClub({
      location_id: String(loc),
      super_category_id: String(superCat),
      category_id: 'bad',
    });
    expect(bySuper).toBe(2);

    const bySub = await venueService.matchingIdsForClub({
      location_id: String(loc),
      super_category_id: String(superCat),
      category_id: String(sub),
    });
    expect(bySub).toHaveLength(1);
    const bravo = await VenueModel.findOne({ venue_name: 'Bravo' }).lean();
    expect(bySub[0]).toBe(String(bravo?._id));
  });
});

describe('public views never leak private venue data', () => {
  it('strips documents, tax ids, bank details, owner contact and deductions', async () => {
    const v = await VenueModel.create({
      owner_user_id: new Types.ObjectId(),
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Open Hall',
      city: 'Pune',
      gstin: '22AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      owner_email: 'owner@example.com',
      owner_phone: '+910000000000',
      owner_address: 'Private Rd',
      owner_dob: new Date('1990-01-01'),
      reviewer_notes: 'internal',
      venue_share_pct: 40,
      venue_commission_pct: 10,
      bank_account: { payout_method: 'UPI', upi_id: 'owner@upi', account_holder_name: 'Owner' },
      documents: [{ type: 'GST', url: 'https://doc.example.test/gst.pdf', uploaded_at: new Date() }],
    });

    const [listed] = await venueService.publicList({ search: 'open' });
    const single = await venueService.getPublicById(String(v._id));

    for (const pub of [listed, single]) {
      expect(pub).toMatchObject({
        venue_name: 'Open Hall',
        city: 'Pune',
        documents: [],
        gstin: '',
        pan: '',
        owner_email: '',
        owner_phone: '',
        owner_dob: null,
        owner_address: '',
        reviewer_notes: '',
        venue_share_pct: 0,
        venue_commission_pct: 0,
        bank_account: { payout_method: 'UPI', upi_id: '', account_number: '', ifsc_code: '', account_holder_name: '' },
      });
    }
  });

  it('a deactivated approved venue is not public, nor an unknown id', async () => {
    const v = await VenueModel.create({ owner_user_id: new Types.ObjectId(), status: 'APPROVED', is_active: false });
    await expect(venueService.getPublicById(String(v._id))).resolves.toBeNull();
    await expect(venueService.getPublicById(missing())).resolves.toBeNull();
  });
});
