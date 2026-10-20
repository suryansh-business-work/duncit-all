import { describe, expect, it } from 'vitest';
import { bookingSpaceLabel, venueSpaces, WHOLE_VENUE_SPACE } from '../src/venue-booking';

describe('venueSpaces', () => {
  it('offers nothing until a venue is picked', () => {
    expect(venueSpaces(null)).toEqual([]);
    expect(venueSpaces(undefined)).toEqual([]);
  });

  it('lists each named capacity item, booked under its own label', () => {
    const venue = { capacity: 40, capacity_items: [{ label: 'Court 1', capacity: 10 }, { label: 'Court 2', capacity: 12 }] };
    expect(venueSpaces(venue)).toEqual([
      { label: 'Court 1', capacity: 10, slotSpaceLabel: 'Court 1' },
      { label: 'Court 2', capacity: 12, slotSpaceLabel: 'Court 2' },
    ]);
  });

  it('falls back to the whole venue, which books with an empty space label', () => {
    const [whole] = venueSpaces({ capacity: 25, capacity_items: [] });
    expect(whole).toEqual({ label: WHOLE_VENUE_SPACE, capacity: 25, slotSpaceLabel: '' });
    expect(bookingSpaceLabel(whole.label)).toBe('');
    expect(venueSpaces({ capacity: null, capacity_items: null })).toEqual([
      { label: WHOLE_VENUE_SPACE, capacity: 0, slotSpaceLabel: '' },
    ]);
  });
});
