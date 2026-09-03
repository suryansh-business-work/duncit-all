/**
 * The venue owner's dashboard tiles.
 *
 * `venueOwnerStats` answers eight numbers; six of them are tiles, in one order,
 * with one formatting each. The Partners console draws them as MUI stat cards
 * and the two apps as Tamagui tiles, but WHICH numbers, in WHAT order and
 * whether a figure is money or a count is decided once, here, so the three
 * surfaces read the same dashboard (rules 27 + 40).
 *
 * No user-facing word lives in this module: the caller labels each tile by its
 * key from its own bundle.
 */

/** What `venueOwnerStats` answers, whether scoped to one venue or all of them. */
export interface VenueOwnerStats {
  total_venues: number;
  approved_venues: number;
  total_capacity: number;
  potential_earning: number;
  booked_earning: number;
  upcoming_slots: number;
  booked_slots: number;
  pending_requests: number;
}

/** The dashboard before the query answers — every figure at zero. */
export const emptyVenueOwnerStats: VenueOwnerStats = {
  total_venues: 0,
  approved_venues: 0,
  total_capacity: 0,
  potential_earning: 0,
  booked_earning: 0,
  upcoming_slots: 0,
  booked_slots: 0,
  pending_requests: 0,
};

/** The stats that become tiles. `total_venues` and `approved_venues` do not — they are the scope, not a figure. */
export type VenueOwnerStatKey =
  | 'potential_earning'
  | 'booked_earning'
  | 'upcoming_slots'
  | 'booked_slots'
  | 'pending_requests'
  | 'total_capacity';

/** How a tile's number is written: `money` as INR, `count` as a plain integer. */
export type VenueOwnerStatKind = 'money' | 'count';

export interface VenueOwnerStatTile {
  key: VenueOwnerStatKey;
  value: number;
  kind: VenueOwnerStatKind;
}

/** Tile order: what the venue could earn, what it will, then the slots behind those figures. */
const TILES: ReadonlyArray<Pick<VenueOwnerStatTile, 'key' | 'kind'>> = [
  { key: 'potential_earning', kind: 'money' },
  { key: 'booked_earning', kind: 'money' },
  { key: 'upcoming_slots', kind: 'count' },
  { key: 'booked_slots', kind: 'count' },
  { key: 'pending_requests', kind: 'count' },
  { key: 'total_capacity', kind: 'count' },
];

/** The six tiles, in order, each with its figure and how to write it. */
export function venueOwnerStatTiles(stats: VenueOwnerStats): VenueOwnerStatTile[] {
  return TILES.map(({ key, kind }) => ({ key, kind, value: stats[key] }));
}
