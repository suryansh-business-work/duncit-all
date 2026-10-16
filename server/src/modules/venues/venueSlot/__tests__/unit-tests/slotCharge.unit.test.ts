import { pricingModeOf, slotHours, slotVenueCharge } from '../../slotCharge';
import { venueUsageOf } from '@modules/finance/finance/settlement.service';

/*
  How a venue's slot is charged. A slot the venue priced FLAT with no
  overtime must settle exactly as it did before pricing modes existed.
*/

const twoHours = { start_at: '2026-11-01T10:00:00.000Z', end_at: '2026-11-01T12:00:00.000Z' };

describe('slotVenueCharge', () => {
  it('charges a flat slot its price, whoever came', () => {
    expect(slotVenueCharge({ ...twoHours, price: 1500 }, { pax: 40 })).toEqual({
      mode: 'FLAT',
      base: 1500,
      overtime: 0,
      total: 1500,
    });
  });

  it('charges an hourly slot for every hour of it', () => {
    expect(slotVenueCharge({ ...twoHours, price: 600, pricing_mode: 'HOURLY' }).total).toBe(1200);
  });

  it('charges a per-guest slot for the guests counted, and nothing for none', () => {
    expect(slotVenueCharge({ ...twoHours, price: 150, pricing_mode: 'PER_PAX' }, { pax: 12 }).total).toBe(1800);
    expect(slotVenueCharge({ ...twoHours, price: 150, pricing_mode: 'PER_PAX' }).total).toBe(0);
  });

  it('adds overtime at the venue rate for the hours past the slot', () => {
    const charge = slotVenueCharge({ ...twoHours, price: 1000, overtime_rate: 300 }, { overtimeHours: 1.5 });
    expect(charge).toEqual({ mode: 'FLAT', base: 1000, overtime: 450, total: 1450 });
  });

  it('never charges below zero for junk input', () => {
    const charge = slotVenueCharge({ price: -10, overtime_rate: -5, pricing_mode: 'PER_PAX' }, { pax: -3, overtimeHours: -2 });
    expect(charge.total).toBe(0);
  });
});

describe('slot pricing helpers', () => {
  it('reads an unknown mode as FLAT', () => {
    expect(pricingModeOf('HOURLY')).toBe('HOURLY');
    expect(pricingModeOf('WEEKLY')).toBe('FLAT');
    expect(pricingModeOf(null)).toBe('FLAT');
  });

  it('measures a slot in hours, and an open or inverted one as none', () => {
    expect(slotHours(twoHours)).toBe(2);
    expect(slotHours({ start_at: twoHours.end_at, end_at: twoHours.start_at })).toBe(0);
    expect(slotHours({ start_at: null, end_at: twoHours.end_at })).toBe(0);
  });
});

describe('venueUsageOf', () => {
  it('passes what completion entered, overtime to the quarter hour', () => {
    expect(venueUsageOf({ venue_pax: 18, overtime_hours: 1.3 })).toEqual({ pax: 18, overtimeHours: 1.25 });
    expect(venueUsageOf({})).toEqual({});
  });

  it('refuses a fractional or out-of-range guest count, and overtime past 48 hours', () => {
    expect(() => venueUsageOf({ venue_pax: 2.5 })).toThrow(/whole number/);
    expect(() => venueUsageOf({ venue_pax: 10_001 })).toThrow(/whole number/);
    expect(() => venueUsageOf({ overtime_hours: 49 })).toThrow(/0 to 48/);
    expect(() => venueUsageOf({ overtime_hours: -1 })).toThrow(/0 to 48/);
  });
});
