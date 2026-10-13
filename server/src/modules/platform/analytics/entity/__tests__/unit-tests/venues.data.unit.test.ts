/**
 * How Analytics > Venues counts a venue per category now that one venue can
 * belong to several: once in EACH category it holds, never twice in one.
 */
import { Types } from 'mongoose';
import { venuesByCategory, type VenueRow } from '../../venues.data';

const oid = () => new Types.ObjectId();
const venue = (over: Partial<VenueRow>): VenueRow => ({
  _id: oid(),
  venue_name: 'Venue',
  status: 'APPROVED',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  ...over,
});

describe('venuesByCategory', () => {
  const racquet = oid();
  const mind = oid();

  it('counts a venue in two categories in both, and once in a category it holds two subs of', () => {
    const counts = venuesByCategory([
      venue({ venue_categories: [{ category_id: racquet }, { category_id: mind }, { category_id: racquet }] }),
      venue({ venue_categories: [{ category_id: mind }] }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ [racquet.toHexString()]: 1, [mind.toHexString()]: 2 });
    // Two venues, three slice entries: the slices are per category, not a partition.
    expect([...counts.values()].reduce((sum, n) => sum + n, 0)).toBe(3);
  });

  it('counts a venue stored before the list existed under its one legacy category', () => {
    const counts = venuesByCategory([
      venue({ venue_category: { category_id: racquet } }),
      venue({ venue_categories: [], venue_category: { category_id: racquet } }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ [racquet.toHexString()]: 2 });
  });

  it('files a venue with no category — or a category row without one — under "none", once', () => {
    const counts = venuesByCategory([
      venue({}),
      venue({ venue_categories: [], venue_category: {} }),
      venue({ venue_categories: [{ category_id: null }, { category_id: null }] }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ none: 3 });
  });

  it('is empty for no venues', () => {
    expect(venuesByCategory([]).size).toBe(0);
  });
});
