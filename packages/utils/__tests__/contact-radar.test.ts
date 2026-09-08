import { describe, expect, it } from 'vitest';
import {
  CONTACT_KEY_MIN_DIGITS,
  RADAR_MAX_ITEMS,
  RADAR_RING_CAPACITY,
  RADAR_RINGS,
  contactEntriesFromPhoneBook,
  radarPositions,
} from '../src/contact-radar';

describe('contactEntriesFromPhoneBook', () => {
  it('keys every number the way the server compares it and drops the phone book', () => {
    const entries = contactEntriesFromPhoneBook([
      { name: 'Riya Sharma', phones: ['+91 98765 43210', '098765 43210'] },
      { name: 'Aman', phones: ['9123456789'] },
    ]);
    expect(entries).toEqual([
      { phone_key: '9876543210', label: 'Riya Sharma' },
      { phone_key: '9123456789', label: 'Aman' },
    ]);
  });

  it('keeps the first name seen for a number, unless that name was blank', () => {
    const entries = contactEntriesFromPhoneBook([
      { name: '', phones: ['9876543210'] },
      { name: 'Riya', phones: ['9876543210'] },
      { name: 'Riya Again', phones: ['9876543210'] },
      { name: null, phones: [null, undefined] },
    ]);
    expect(entries).toEqual([{ phone_key: '9876543210', label: 'Riya' }]);
  });

  it('ignores short codes and typos shorter than the minimum', () => {
    const short = '1'.repeat(CONTACT_KEY_MIN_DIGITS - 1);
    expect(contactEntriesFromPhoneBook([{ name: 'Bank', phones: [short, '12345'] }])).toEqual([]);
  });
});

describe('radarPositions', () => {
  it('seats nearby people on the inner ring and everyone else further out', () => {
    const points = radarPositions([
      { id: 'far', nearby: false },
      { id: 'near', nearby: true },
    ]);
    expect(points.get('near')?.ring).toBe(0);
    expect(points.get('far')?.ring).toBe(0);
    // Both sit on the innermost ring's radius, as fractions of the width.
    const near = points.get('near')!;
    const distance = Math.hypot(near.x - 0.5, near.y - 0.5);
    expect(distance).toBeCloseTo(RADAR_RINGS[0] / 2, 6);
  });

  it('spills onto the next ring once a ring is full, and stops plotting past the last', () => {
    const items = Array.from({ length: RADAR_MAX_ITEMS + 3 }, (_, index) => ({
      id: `u${index}`,
      nearby: index % 2 === 0,
    }));
    const points = radarPositions(items);
    expect(points.size).toBe(RADAR_MAX_ITEMS);
    const rings = new Set([...points.values()].map((point) => point.ring));
    expect(rings).toEqual(new Set(RADAR_RING_CAPACITY.map((_, ring) => ring)));
    // Nearby people are seated first, so the ones left standing are the last
    // of the far-away ones — the final even id is nearby and still plotted.
    expect(points.has(`u${RADAR_MAX_ITEMS + 2}`)).toBe(true);
    expect(points.has(`u${RADAR_MAX_ITEMS + 1}`)).toBe(false);
  });

  it('returns nothing for nobody', () => {
    expect(radarPositions([]).size).toBe(0);
  });
});
