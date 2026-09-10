import { describe, expect, it } from 'vitest';
import {
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

  it('maps the category triple onto the picker ids', () => {
    const { category } = venueToValues(venueRecord);
    expect(category.super_id).toBe('66a0000000000000000000a1');
    expect(category.category_id).toBe('66a0000000000000000000b2');
    expect(category.sub_id).toBe('66a0000000000000000000c3');
    expect(category.sub_name).toBe('Catan Night');
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
      venue_category: {
        ...venueRecord.venue_category,
        super_category_id: null,
        category_id: null,
        sub_category_id: null,
      },
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
    expect(values.category.super_id).toBe('');
    expect(values.category.category_id).toBe('');
    expect(values.category.sub_id).toBe('');
    // The names survive even when the ids are gone — the picker shows what the
    // venue was approved under while asking for it to be re-picked.
    expect(values.category.sub_name).toBe('Catan Night');
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
});

describe('valuesToStep1', () => {
  it('sends the category triple only when a sub is chosen', () => {
    const values = venueToValues(venueRecord);
    expect(valuesToStep1(values).venue_category).toEqual({
      super_category_id: '66a0000000000000000000a1',
      category_id: '66a0000000000000000000b2',
      sub_category_id: '66a0000000000000000000c3',
    });
  });

  it('omits the category entirely when the triple is incomplete', () => {
    // The server rejects a partial triple, so a half-picked category must be
    // left out rather than sent as three empty ids.
    const values = venueToValues(venueRecord);
    values.category = { ...values.category, sub_id: '', sub_name: '' };
    expect(valuesToStep1(values).venue_category).toBeUndefined();
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
