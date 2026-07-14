import { formatDistance, haversineKm } from '@/utils/distance';

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
  });

  it('measures the great-circle distance between two cities', () => {
    // Mumbai → New Delhi is ~1150 km.
    const km = haversineKm(19.076, 72.8777, 28.6139, 77.209);
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1200);
  });
});

describe('formatDistance', () => {
  it('renders metres under 1 km', () => {
    expect(formatDistance(0.75)).toBe('750 m away');
  });

  it('renders kilometres from 1 km up', () => {
    expect(formatDistance(3.42)).toBe('3.4 km away');
  });
});
