import { describe, expect, it } from 'vitest';
import {
  emptyVenueOwnerStats,
  venueOwnerStatTiles,
  type VenueOwnerStats,
} from '../src/venue-dashboard';

/** One owner's figures across two venues, as `venueOwnerStats` answers them. */
const STATS: VenueOwnerStats = {
  total_venues: 2,
  approved_venues: 2,
  total_capacity: 140,
  potential_earning: 86_500,
  booked_earning: 31_200,
  upcoming_slots: 18,
  booked_slots: 7,
  pending_requests: 3,
};

describe('venueOwnerStatTiles', () => {
  it('draws the six tiles in order — earnings first, then the slots behind them', () => {
    expect(venueOwnerStatTiles(STATS)).toEqual([
      { key: 'potential_earning', kind: 'money', value: 86_500 },
      { key: 'booked_earning', kind: 'money', value: 31_200 },
      { key: 'upcoming_slots', kind: 'count', value: 18 },
      { key: 'booked_slots', kind: 'count', value: 7 },
      { key: 'pending_requests', kind: 'count', value: 3 },
      { key: 'total_capacity', kind: 'count', value: 140 },
    ]);
  });

  it('never tiles the venue counts — they are the scope, not a figure', () => {
    const keys = venueOwnerStatTiles(STATS).map((tile) => tile.key);
    expect(keys).not.toContain('total_venues');
    expect(keys).not.toContain('approved_venues');
  });
});

describe('emptyVenueOwnerStats', () => {
  it('draws every tile at zero before the query answers', () => {
    expect(venueOwnerStatTiles(emptyVenueOwnerStats).every((tile) => tile.value === 0)).toBe(true);
    expect(Object.values(emptyVenueOwnerStats)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
