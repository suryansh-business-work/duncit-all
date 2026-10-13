/**
 * The one place a venue's categories are read: the list, the legacy single it
 * mirrors, and a document saved before the list existed. Pure functions — the
 * mongo behaviour of `venueCategoryMatch` is pinned against a real database in
 * venue.categories.int.test.ts.
 */
import { Types } from 'mongoose';
import {
  VENUE_CATEGORY_PATHS,
  dedupeVenueCategories,
  hasVenueCategory,
  pickVenueCategory,
  planVenueCategoryBackfill,
  venueCategoriesOf,
  venueCategoryKey,
  venueCategoryMatch,
  venueHostsSubCategory,
  venueSubCategoryIds,
  type VenueCategoryCarrier,
  type VenueCategoryRef,
} from '../../venue.categories';

const oid = () => new Types.ObjectId();
const triple = (sub: Types.ObjectId, name = 'Padel') => ({
  super_category_id: oid(),
  category_id: oid(),
  sub_category_id: sub,
  super_category_name: 'Sports',
  category_name: 'Racquet',
  sub_category_name: name,
});

describe('hasVenueCategory', () => {
  it('is false for nothing and for the empty subdocument a venue is created with', () => {
    expect(hasVenueCategory()).toBe(false);
    expect(hasVenueCategory(null)).toBe(false);
    expect(hasVenueCategory({})).toBe(false);
    expect(hasVenueCategory({ super_category_id: null, sub_category_name: '' })).toBe(false);
  });

  it('is true as soon as one id or one name is there', () => {
    expect(hasVenueCategory({ sub_category_id: oid() })).toBe(true);
    expect(hasVenueCategory({ category_name: 'Racquet' })).toBe(true);
  });
});

describe('pickVenueCategory / venueCategoryKey', () => {
  it('copies the six fields, filling what is missing and dropping what is extra', () => {
    const sub = oid();
    const picked = pickVenueCategory({ sub_category_id: sub, sub_category_name: 'Padel', request_no: 'X' } as never);
    expect(picked).toEqual({
      super_category_id: null,
      category_id: null,
      sub_category_id: sub,
      super_category_name: '',
      category_name: '',
      sub_category_name: 'Padel',
    });
  });

  it('keys a triple by ids and names, so a renamed category is a different key', () => {
    const sub = oid();
    const a = triple(sub);
    expect(venueCategoryKey(a)).toBe(venueCategoryKey({ ...a }));
    expect(venueCategoryKey(a)).not.toBe(venueCategoryKey({ ...a, sub_category_name: 'Pickleball' }));
    expect(venueCategoryKey(a)).not.toBe(venueCategoryKey({ ...a, sub_category_id: oid() }));
    expect(venueCategoryKey(null)).toBe('');
    expect(venueCategoryKey()).toBe('');
  });
});

describe('venueCategoriesOf', () => {
  it('returns the list, primary first, as a copy', () => {
    const list = [triple(oid()), triple(oid(), 'Squash')];
    const out = venueCategoriesOf({ venue_categories: list, venue_category: list[0] });
    expect(out).toEqual(list);
    expect(out).not.toBe(list);
  });

  it('treats the legacy triple of a document without a list as a one-entry list', () => {
    const legacy = triple(oid());
    expect(venueCategoriesOf({ venue_category: legacy })).toEqual([legacy]);
    expect(venueCategoriesOf({ venue_categories: [], venue_category: legacy })).toEqual([legacy]);
    expect(venueCategoriesOf({ venue_categories: null, venue_category: legacy })).toEqual([legacy]);
  });

  it('is empty for a venue with no category, and for no venue at all', () => {
    expect(venueCategoriesOf({ venue_categories: [], venue_category: {} })).toEqual([]);
    expect(venueCategoriesOf({})).toEqual([]);
    expect(venueCategoriesOf(null)).toEqual([]);
    expect(venueCategoriesOf()).toEqual([]);
  });
});

describe('dedupeVenueCategories', () => {
  it('keeps the first entry per sub category and the order of the rest', () => {
    const a = oid();
    const b = oid();
    const first = triple(a, 'First');
    const list: VenueCategoryRef[] = [first, triple(b), triple(a, 'Again'), { category_name: 'No sub' }, { category_name: 'No sub' }];
    const out = dedupeVenueCategories(list);
    expect(out.map((c) => c.sub_category_name ?? c.category_name)).toEqual(['First', 'Padel', 'No sub', 'No sub']);
    expect(out[0]).toBe(first);
  });

  it('compares ids by value, whether they arrive as strings or ObjectIds', () => {
    const a = oid();
    expect(dedupeVenueCategories([{ sub_category_id: String(a) }, { sub_category_id: a }])).toHaveLength(1);
  });
});

describe('venueSubCategoryIds / venueHostsSubCategory', () => {
  it('lists each sub category once, primary first, skipping entries without one', () => {
    const a = oid();
    const b = oid();
    const venue: VenueCategoryCarrier<VenueCategoryRef<Types.ObjectId>> = {
      venue_categories: [triple(a), { category_id: oid() }, triple(b), triple(a)],
    };
    expect(venueSubCategoryIds(venue)).toEqual([a, b]);
    expect(venueSubCategoryIds({ venue_category: {} })).toEqual([]);
    expect(venueSubCategoryIds()).toEqual([]);
  });

  it('says yes when ANY category carries the sub — the second as much as the first', () => {
    const a = oid();
    const b = oid();
    const venue = { venue_categories: [triple(a), triple(b)], venue_category: triple(a) };
    expect(venueHostsSubCategory(venue, a)).toBe(true);
    expect(venueHostsSubCategory(venue, String(b))).toBe(true);
    expect(venueHostsSubCategory(venue, oid())).toBe(false);
  });

  it('reads a document not yet migrated through its legacy triple', () => {
    const a = oid();
    expect(venueHostsSubCategory({ venue_category: triple(a) }, a)).toBe(true);
  });

  it('never matches a missing sub category, a venue with none, or no venue', () => {
    expect(venueHostsSubCategory({ venue_category: triple(oid()) }, null)).toBe(false);
    expect(venueHostsSubCategory({ venue_category: triple(oid()) })).toBe(false);
    expect(venueHostsSubCategory({ venue_categories: [], venue_category: {} }, oid())).toBe(false);
    expect(venueHostsSubCategory(null, oid())).toBe(false);
  });
});

describe('venueCategoryMatch', () => {
  it('is empty when no level is given, so it can be spread into any filter', () => {
    expect(venueCategoryMatch({})).toEqual({});
    expect(venueCategoryMatch({ super_category_id: null, sub_category_id: null })).toEqual({});
  });

  it('asks for every level on ONE list entry, or on the legacy triple', () => {
    const superId = oid();
    const subId = oid();
    expect(venueCategoryMatch({ super_category_id: superId, category_id: null, sub_category_id: subId })).toEqual({
      $or: [
        { venue_categories: { $elemMatch: { super_category_id: superId, sub_category_id: subId } } },
        { 'venue_category.super_category_id': superId, 'venue_category.sub_category_id': subId },
      ],
    });
  });

  it('names the two paths a triple lives at, the list first', () => {
    expect(VENUE_CATEGORY_PATHS).toEqual(['venue_categories', 'venue_category']);
  });
});

describe('planVenueCategoryBackfill', () => {
  it('fills the list from the legacy triple of a venue that has none', () => {
    const legacy = triple(oid());
    for (const venue_categories of [undefined, null, []]) {
      expect(planVenueCategoryBackfill({ venue_categories, venue_category: legacy })).toEqual({
        action: 'fill',
        venue_categories: [legacy],
      });
    }
  });

  it('fills with a clean six-field entry even from a partial legacy triple', () => {
    const sub = oid();
    expect(planVenueCategoryBackfill({ venue_category: { sub_category_id: sub } })).toEqual({
      action: 'fill',
      venue_categories: [pickVenueCategory({ sub_category_id: sub })],
    });
  });

  it('skips a venue with no category at all — it never invents one', () => {
    expect(planVenueCategoryBackfill({})).toEqual({ action: 'skip' });
    expect(planVenueCategoryBackfill({ venue_categories: [], venue_category: {} })).toEqual({ action: 'skip' });
    expect(planVenueCategoryBackfill({ venue_category: null })).toEqual({ action: 'skip' });
  });

  it('skips a venue whose legacy triple already mirrors the first entry', () => {
    const first = triple(oid());
    expect(
      planVenueCategoryBackfill({ venue_categories: [first, triple(oid())], venue_category: { ...first } })
    ).toEqual({ action: 'skip' });
  });

  it('re-mirrors the legacy triple from the list when they have drifted — the list is the truth', () => {
    const first = triple(oid());
    const stale = triple(oid(), 'Stale');
    expect(planVenueCategoryBackfill({ venue_categories: [first], venue_category: stale })).toEqual({
      action: 'mirror',
      venue_category: first,
    });
    expect(planVenueCategoryBackfill({ venue_categories: [first] })).toEqual({
      action: 'mirror',
      venue_category: first,
    });
  });

  it('is idempotent: applying a plan leaves nothing to plan', () => {
    const legacy = triple(oid());
    const filled = planVenueCategoryBackfill({ venue_category: legacy });
    expect(filled.action).toBe('fill');
    const afterFill = { venue_category: legacy, venue_categories: filled.action === 'fill' ? filled.venue_categories : [] };
    expect(planVenueCategoryBackfill(afterFill)).toEqual({ action: 'skip' });

    const first = triple(oid());
    const mirrored = planVenueCategoryBackfill({ venue_categories: [first], venue_category: legacy });
    expect(mirrored.action).toBe('mirror');
    const afterMirror = {
      venue_categories: [first],
      venue_category: mirrored.action === 'mirror' ? mirrored.venue_category : legacy,
    };
    expect(planVenueCategoryBackfill(afterMirror)).toEqual({ action: 'skip' });
  });
});
