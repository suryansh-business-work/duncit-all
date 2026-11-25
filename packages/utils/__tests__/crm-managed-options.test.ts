import { describe, expect, it } from 'vitest';
import { crmFilterManagedOptions, crmNextManagedOrder, crmSortManagedOptions } from '../src';

/** The Amenities / Event Suitability lists: order, search and where a new entry goes. */

const rows = [
  { name: 'Stage', sort_order: 2 },
  { name: 'AC', sort_order: 1 },
  { name: 'Parking', sort_order: 1 },
];

describe('crmSortManagedOptions', () => {
  it('orders by place, then by name, without touching the list it was given', () => {
    expect(crmSortManagedOptions(rows).map((r) => r.name)).toEqual(['AC', 'Parking', 'Stage']);
    expect(rows[0]?.name).toBe('Stage');
  });
});

describe('crmFilterManagedOptions', () => {
  it('keeps names that contain the search, in any case, and everything for an empty search', () => {
    expect(crmFilterManagedOptions(rows, ' PARK ')).toEqual([{ name: 'Parking', sort_order: 1 }]);
    expect(crmFilterManagedOptions(rows, '')).toEqual(rows);
    expect(crmFilterManagedOptions(rows, 'pool')).toEqual([]);
  });
});

describe('crmNextManagedOrder', () => {
  it('puts a new entry after the last one, or first in an empty list', () => {
    expect(crmNextManagedOrder(rows)).toBe(3);
    expect(crmNextManagedOrder([])).toBe(0);
  });
});
