import { describe, expect, it } from 'vitest';
import {
  capacityTotal,
  valuesToSettingsInput,
  valuesToStep1,
  valuesToStep2,
  valuesToStep3,
  venueToValues,
} from '../../../src/venues/editor/mappers';
import { blankVenueValues } from '../../../src/venues/editor/types';
import { venueRecord } from '../../fixtures';

/**
 * The record <-> form mapping.
 *
 * This is where a venue's data can silently go missing: one press of Save is
 * four mutations, and a field dropped here is a field the admin edited and the
 * server never heard about.
 */
describe('venueToValues', () => {
  it('carries every section of the stored record onto the form', () => {
    const values = venueToValues(venueRecord);

    expect(values.id).toBe(venueRecord.id);
    expect(values.owner_user_id).toBe(venueRecord.owner_user_id);
    expect(values.venue_name).toBe('Third Wave Coffee, Indiranagar');
    expect(values.capacity_items).toEqual([
      { label: 'Ground floor', capacity: 40 },
      { label: 'Terrace', capacity: 20 },
    ]);
    expect(values.documents).toEqual([
      { type: 'GST Certificate', url: 'https://ik.imagekit.io/d/gst.pdf' },
    ]);
    expect(values.bank_account.ifsc_code).toBe('HDFC0001234');
    expect(values.status).toBe('APPROVED');
    expect(values.is_active).toBe(true);
  });

  it('flattens the address into the location picker shape', () => {
    const { location } = venueToValues(venueRecord);
    // The picker owns the whole cascade, and `postal_code` becomes `pincode`.
    expect(location).toEqual({
      location_id: '66b0000000000000000000d4',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      state_code: 'KA',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      pincode: '560038',
    });
  });

  it('opens one picker row per category, primary first', () => {
    const { categories } = venueToValues(venueRecord);
    expect(categories).toEqual([
      {
        super_id: '66a0000000000000000000a1',
        super_name: 'Social',
        category_id: '66a0000000000000000000b2',
        category_name: 'Board Games',
        sub_id: '66a0000000000000000000c3',
        sub_name: 'Catan Night',
      },
      {
        super_id: '66a0000000000000000000a1',
        super_name: 'Social',
        category_id: '66a0000000000000000000b5',
        category_name: 'Quizzes',
        sub_id: '66a0000000000000000000c6',
        sub_name: 'Pub Quiz',
      },
    ]);
  });

  it('falls back to the lone legacy triple of a venue stored before the list existed', () => {
    const { categories } = venueToValues({ ...venueRecord, venue_categories: [] });
    expect(categories).toHaveLength(1);
    expect(categories[0].sub_id).toBe('66a0000000000000000000c3');
    expect(categories[0].sub_name).toBe('Catan Night');
  });

  it('opens on no row at all for a venue filed under no category', () => {
    const { categories } = venueToValues({
      ...venueRecord,
      venue_categories: [],
      venue_category: {
        super_category_id: null,
        category_id: null,
        sub_category_id: null,
        super_category_name: '',
        category_name: '',
        sub_category_name: '',
      },
    });
    expect(categories).toEqual([]);
  });

  it('flattens both cancellation ladders and the auto-extend block', () => {
    const { settings } = venueToValues(venueRecord);
    expect(settings.open).toBe('08:00');
    expect(settings.close).toBe('23:00');
    expect(settings.weekly_off_days).toEqual([1]);
    expect(settings.holidays).toEqual(['2026-01-26']);
    expect(settings.auto_extend_enabled).toBe(true);
    expect(settings.auto_extend_horizon_days).toBe(30);
    expect(settings.charge_tiers).toEqual([
      { hours_before: 24, charge_type: 'PERCENT', value: 50 },
    ]);
    expect(settings.trigger_hours).toBe(6);
    expect(settings.refund_tiers).toEqual([{ hours_before: 24, refund_pct: 100 }]);
  });

  it('opens correctly on a record where every NULLABLE field is null', () => {
    // Only eleven fields on this query can be null; everything else is String! /
    // [X!]! and carries no fallback on purpose. This covers all of them at once —
    // the oldest venue in the database, registered before most of them existed.
    const legacy = {
      ...venueRecord,
      venue_no: null,
      location_id: null,
      lat: null,
      lng: null,
      owner_dob: null,
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      venue_categories: [
        {
          ...venueRecord.venue_category,
          super_category_id: null,
          category_id: null,
          sub_category_id: null,
        },
      ],
      bank_account: { ...venueRecord.bank_account, payout_method: null },
      settings: {
        ...venueRecord.settings,
        operating_hours: { open: '', close: '' },
        auto_extend: { ...venueRecord.settings.auto_extend, template_id: null },
      },
    };
    const values = venueToValues(legacy);

    expect(values.location.location_id).toBe('');
    expect(values.owner_dob).toBe('');
    expect(values.bank_account.payout_method).toBe('');
    expect(values.categories).toHaveLength(1);
    expect(values.categories[0].super_id).toBe('');
    expect(values.categories[0].category_id).toBe('');
    expect(values.categories[0].sub_id).toBe('');
    // The names survive even when the ids are gone — the picker shows what the
    // venue was approved under while asking for it to be re-picked.
    expect(values.categories[0].sub_name).toBe('Catan Night');
    // An empty stored window opens on the default a new venue would get.
    expect(values.settings.open).toBe(blankVenueValues.settings.open);
    expect(values.settings.close).toBe(blankVenueValues.settings.close);
  });

  it('keeps a stored operating window that is actually set', () => {
    const values = venueToValues(venueRecord);
    expect(values.settings.open).toBe('08:00');
  });

  it('keeps 0 as a real auto-cancel trigger, not as "unset"', () => {
    // 0 means "cancel right up to the start", so it must not fall back to 6.
    const values = venueToValues({
      ...venueRecord,
      settings: {
        ...venueRecord.settings,
        cancellation: { ...venueRecord.settings.cancellation, trigger_hours: 0 },
      },
    });
    expect(values.settings.trigger_hours).toBe(0);
  });

  it('reads an empty list as an empty list', () => {
    const values = venueToValues({
      ...venueRecord,
      capacity_items: [],
      gallery: [],
      documents: [],
      settings: {
        ...venueRecord.settings,
        cancellation: { ...venueRecord.settings.cancellation, tiers: [], refund_tiers: [] },
      },
    });
    expect(values.capacity_items).toEqual([]);
    expect(values.gallery).toEqual([]);
    expect(values.documents).toEqual([]);
    expect(values.settings.charge_tiers).toEqual([]);
    expect(values.settings.refund_tiers).toEqual([]);
  });

  it('shows the Pod Request override as text, and none as an empty box', () => {
    expect(venueToValues(venueRecord).host_requests_limit_override).toBe('25');
    expect(
      venueToValues({ ...venueRecord, host_requests_limit_override: null }).host_requests_limit_override,
    ).toBe('');
    // 0 is a real override (no requests at all), not "unset".
    expect(venueToValues({ ...venueRecord, host_requests_limit_override: 0 }).host_requests_limit_override).toBe('0');
  });
});

describe('capacityTotal', () => {
  it('adds up the spaces, reading a typed number from its string and a blank as nothing', () => {
    // A number input hands its value back as a string, and '' while it is empty.
    expect(capacityTotal([{ capacity: '12' }, { capacity: '' }, { capacity: 8 }])).toBe(20);
    expect(capacityTotal([])).toBe(0);
  });
});

describe('valuesToStep1', () => {
  it('sends every category as its id triple, primary first', () => {
    const step1 = valuesToStep1(venueToValues(venueRecord));
    expect(step1.venue_categories).toEqual([
      {
        super_category_id: '66a0000000000000000000a1',
        category_id: '66a0000000000000000000b2',
        sub_category_id: '66a0000000000000000000c3',
      },
      {
        super_category_id: '66a0000000000000000000a1',
        category_id: '66a0000000000000000000b5',
        sub_category_id: '66a0000000000000000000c6',
      },
    ]);
    // The single-category field is never sent: the server ignores it beside the list.
    expect(step1).not.toHaveProperty('venue_category');
  });

  it('leaves out a row that is not a whole triple', () => {
    // The server rejects a partial triple, so a half-picked row must be left
    // out rather than sent with an empty id.
    const values = venueToValues(venueRecord);
    values.categories[1] = { ...values.categories[1], sub_id: '', sub_name: '' };
    expect(valuesToStep1(values).venue_categories).toEqual([
      {
        super_category_id: '66a0000000000000000000a1',
        category_id: '66a0000000000000000000b2',
        sub_category_id: '66a0000000000000000000c3',
      },
    ]);
  });

  it('sends an empty list for a venue with no category chosen', () => {
    const values = venueToValues(venueRecord);
    values.categories = [];
    expect(valuesToStep1(values).venue_categories).toEqual([]);
  });

  it('sends the sum of the named spaces as the total, whatever the scalar holds', () => {
    // The server derives the same sum whenever spaces are sent, so a stale
    // scalar must never be what the request claims.
    const values = venueToValues(venueRecord);
    values.capacity = 999;
    expect(valuesToStep1(values).capacity).toBe(60);
  });

  it('keeps the typed total for a venue with no named spaces', () => {
    const values = venueToValues(venueRecord);
    values.capacity_items = [];
    values.capacity = 75;
    const step1 = valuesToStep1(values);
    expect(step1.capacity).toBe(75);
    expect(step1.capacity_items).toEqual([]);
  });

  it('unwraps the location back into the flat address fields', () => {
    const step1 = valuesToStep1(venueToValues(venueRecord));
    expect(step1.city).toBe('Bengaluru');
    expect(step1.state_code).toBe('KA');
    expect(step1.postal_code).toBe('560038');
    expect(step1.location_id).toBe('66b0000000000000000000d4');
  });

  it('sends no location_id at all when no city was picked', () => {
    const values = venueToValues(venueRecord);
    values.location = { ...values.location, location_id: '' };
    expect(valuesToStep1(values).location_id).toBeUndefined();
  });

  it('keeps a stored dish under its id, and sends a new one with no id and no unchosen enum', () => {
    const values = venueToValues(venueRecord);
    values.food_menu.push({
      item_id: '',
      name: 'Masala Dosa',
      description: '',
      category: 'Mains',
      price: 220,
      images: [],
      // Neither select was touched: '' is the select's empty value, not an enum.
      diet: '',
      spice_level: '',
      is_available: true,
    });
    const [stored, added] = valuesToStep1(values).food_menu ?? [];

    expect(stored).toMatchObject({ id: '66e0000000000000000000f1', diet: 'VEG', spice_level: 'NONE' });
    expect(added).not.toHaveProperty('id');
    // An unchosen enum goes as null, which the server reads as its own default.
    expect(added.diet).toBeNull();
    expect(added.spice_level).toBeNull();
    expect(added.name).toBe('Masala Dosa');
  });

  it("never names the owner's Razorpay account, and sends only the switch while food is off", () => {
    const values = venueToValues(venueRecord);
    values.offers_food = true;
    values.food_ordering = { ...values.food_ordering, razorpay_integration_id: 'rzp-1', razorpay_linked: true };
    expect(valuesToStep1(values).food_ordering).not.toHaveProperty('razorpay_integration_id');

    values.offers_food = false;
    const step1 = valuesToStep1(values);
    expect(step1.offers_food).toBe(false);
    expect(step1).not.toHaveProperty('food_menu');
    expect(step1).not.toHaveProperty('food_ordering');
  });
});

describe('valuesToStep2', () => {
  it('drops document rows missing a type or a file', () => {
    const values = venueToValues(venueRecord);
    values.documents = [
      { type: 'GST Certificate', url: 'https://x/gst.pdf' },
      { type: '', url: 'https://x/orphan.pdf' },
      { type: 'PAN Card', url: '' },
    ];
    expect(valuesToStep2(values).documents).toEqual([
      { type: 'GST Certificate', url: 'https://x/gst.pdf' },
    ]);
  });
});

describe('valuesToStep3', () => {
  it('omits an empty date of birth rather than sending a blank string', () => {
    const values = venueToValues(venueRecord);
    values.owner_dob = '';
    expect(valuesToStep3(values).owner_dob).toBeUndefined();
  });

  it('carries the owner contact and payout block', () => {
    const step3 = valuesToStep3(venueToValues(venueRecord));
    expect(step3.owner_email).toBe('rohit@thirdwave.example');
    expect(step3.owner_dob).toBe('1989-04-17');
    expect(step3.bank_account.payout_method).toBe('IMPS');
  });

  it('omits an unchosen payout method — "" is not a BankPayoutMethod', () => {
    const values = venueToValues(venueRecord);
    values.bank_account.payout_method = '';
    const step3 = valuesToStep3(values);
    expect(step3.bank_account.payout_method).toBeUndefined();
    expect(step3.bank_account.ifsc_code).toBe('HDFC0001234');
  });
});

describe('valuesToSettingsInput', () => {
  it('rebuilds the nested settings the mutation expects', () => {
    const input = valuesToSettingsInput(venueToValues(venueRecord));

    expect(input.operating_hours).toEqual({ open: '08:00', close: '23:00' });
    expect(input.rules.buffer_minutes).toBe(15);
    expect(input.auto_extend).toEqual({ enabled: true, horizon_days: 30, until: '' });
    expect(input.cancellation).toEqual({
      reschedule_only: false,
      tiers: [{ hours_before: 24, charge_type: 'PERCENT', value: 50 }],
      trigger_hours: 6,
      refund_tiers: [{ hours_before: 24, refund_pct: 100 }],
    });
  });

  it('round-trips: what comes off the record goes back unchanged', () => {
    // The settings mutation MERGES, so a field this drops keeps its old value
    // silently — a round-trip is the only assertion that catches that.
    const input = valuesToSettingsInput(venueToValues(venueRecord));
    expect(input.operating_hours).toEqual(venueRecord.settings.operating_hours);
    expect(input.weekly_off_days).toEqual(venueRecord.settings.weekly_off_days);
    expect(input.holidays).toEqual(venueRecord.settings.holidays);
    expect(input.rules).toEqual(venueRecord.settings.rules);
  });
});
