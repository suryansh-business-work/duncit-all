import { describe, expect, it } from 'vitest';
import type { SavedCategory } from '../queries';
import {
  DEFAULT_SAVED_FILTERS,
  activeSavedFilterCount,
  categoriesUnder,
  effectiveCategoryId,
  subsUnder,
  superCategories,
} from '../savedItemsFilter';

const cats: SavedCategory[] = [
  { id: 'sup', name: 'For You', slug: 'you', level: 'SUPER', parent_id: null },
  { id: 'cat', name: 'Sports', slug: 'sports', level: 'CATEGORY', parent_id: 'sup' },
  { id: 'sub', name: 'Cricket', slug: 'cricket', level: 'SUB', parent_id: 'cat' },
  { id: 'other', name: 'Other Cat', slug: 'other', level: 'CATEGORY', parent_id: 'sup2' },
];

describe('savedItemsFilter', () => {
  it('lists super categories and cascades categories/subs by parent', () => {
    expect(superCategories(cats).map((c) => c.id)).toEqual(['sup']);
    expect(categoriesUnder(cats, 'sup').map((c) => c.id)).toEqual(['cat']);
    expect(categoriesUnder(cats, '')).toEqual([]);
    expect(subsUnder(cats, 'cat').map((c) => c.id)).toEqual(['sub']);
    expect(subsUnder(cats, '')).toEqual([]);
  });

  it('sends the deepest selected node as the effective category id', () => {
    expect(effectiveCategoryId(DEFAULT_SAVED_FILTERS)).toBeNull();
    expect(effectiveCategoryId({ ...DEFAULT_SAVED_FILTERS, superId: 'sup' })).toBe('sup');
    expect(effectiveCategoryId({ ...DEFAULT_SAVED_FILTERS, superId: 'sup', categoryId: 'cat' })).toBe('cat');
    expect(effectiveCategoryId({ superId: 'sup', categoryId: 'cat', subId: 'sub', sort: 'RECENT' })).toBe('sub');
  });

  it('counts active category levels', () => {
    expect(activeSavedFilterCount(DEFAULT_SAVED_FILTERS)).toBe(0);
    expect(activeSavedFilterCount({ superId: 'sup', categoryId: 'cat', subId: 'sub', sort: 'RECENT' })).toBe(3);
  });
});
