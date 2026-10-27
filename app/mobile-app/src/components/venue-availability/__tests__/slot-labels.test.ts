import { formatMoney } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import { SLOT_STATUS_TONE, slotPriceLabel, slotStatusTone, spaceOptionLabel } from '../slot-labels';

const t: Translate = (key, options) =>
  options?.vars
    ? `${key}|${Object.entries(options.vars)
        .map(([name, value]) => `${name}=${value}`)
        .join(',')}`
    : key;

describe('slotStatusTone', () => {
  it.each(Object.entries(SLOT_STATUS_TONE))('gives %s its own tone', (status, tone) => {
    expect(slotStatusTone(status)).toBe(tone);
  });

  it('mutes a status this build does not know', () => {
    expect(slotStatusTone('SOMETHING_NEW')).toBe('$muted');
  });
});

describe('slotPriceLabel', () => {
  it('says free for a slot with no price', () => {
    expect(slotPriceLabel({ price: 0 }, t)).toBe('availability.free');
    expect(slotPriceLabel({ price: -5, overtime_rate: 100 }, t)).toBe('availability.free');
  });

  it.each([
    ['FLAT', 'availability.priceUnitFlat'],
    ['HOURLY', 'availability.priceUnitHourly'],
    ['PER_PAX', 'availability.priceUnitPerPax'],
  ])('reads a %s price in its own unit', (mode, key) => {
    expect(slotPriceLabel({ price: 399, pricing_mode: mode }, t)).toBe(
      `${key}|price=${formatMoney(399)}`,
    );
  });

  it('reads an unknown or missing mode as a flat price', () => {
    const flat = `availability.priceUnitFlat|price=${formatMoney(100)}`;
    expect(slotPriceLabel({ price: 100, pricing_mode: 'MYSTERY' }, t)).toBe(flat);
    expect(slotPriceLabel({ price: 100 }, t)).toBe(flat);
  });

  it('adds the overtime rate only when there is one', () => {
    const base = `availability.priceUnitHourly|price=${formatMoney(500)}`;
    expect(slotPriceLabel({ price: 500, pricing_mode: 'HOURLY', overtime_rate: 150 }, t)).toBe(
      `${base} availability.overtimeLabel|price=${formatMoney(150)}`,
    );
    expect(slotPriceLabel({ price: 500, pricing_mode: 'HOURLY', overtime_rate: 0 }, t)).toBe(base);
    expect(slotPriceLabel({ price: 500, pricing_mode: 'HOURLY', overtime_rate: null }, t)).toBe(
      base,
    );
  });
});

describe('spaceOptionLabel', () => {
  it('tells two courts apart by their capacity', () => {
    expect(spaceOptionLabel({ label: 'Court 1', capacity: 4 }, t)).toBe(
      'availability.spaceHolds|label=Court 1,capacity=4',
    );
  });

  it('shows just the name when the capacity is unknown', () => {
    expect(spaceOptionLabel({ label: 'Court 1', capacity: 0 }, t)).toBe('Court 1');
  });

  it('calls an unnamed space the whole venue', () => {
    expect(spaceOptionLabel({ label: '', capacity: 0 }, t)).toBe('availability.wholeVenue');
    expect(spaceOptionLabel({ label: '', capacity: 20 }, t)).toBe(
      'availability.spaceHolds|label=availability.wholeVenue,capacity=20',
    );
  });
});
