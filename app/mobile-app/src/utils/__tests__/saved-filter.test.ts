import { SavedPodSort } from '@/generated/graphql/graphql';
import {
  activeSavedFilterCount,
  categoriesUnder,
  DEFAULT_SAVED_FILTERS,
  effectiveCategoryId,
  SAVED_SORTS,
  subsUnder,
  superCategories,
  type SavedCategory,
  type SavedFilters,
} from '@/utils/saved-filter';

const cats: SavedCategory[] = [
  { id: 'sup', name: 'For You', level: 'SUPER', parent_id: null },
  { id: 'cat', name: 'Sports', level: 'CATEGORY', parent_id: 'sup' },
  { id: 'sub', name: 'Cricket', level: 'SUB', parent_id: 'cat' },
  { id: 'other', name: 'Other Cat', level: 'CATEGORY', parent_id: 'sup2' },
];

const filters = (over: Partial<SavedFilters> = {}): SavedFilters => ({
  ...DEFAULT_SAVED_FILTERS,
  ...over,
});

describe('saved-filter', () => {
  it('defaults to the recently-saved sort with no category selected', () => {
    expect(DEFAULT_SAVED_FILTERS).toEqual({
      superId: '',
      categoryId: '',
      subId: '',
      sort: SavedPodSort.Recent,
    });
  });

  it('exposes the seven sort options with their labels', () => {
    expect(SAVED_SORTS.map(([value]) => value)).toEqual([
      SavedPodSort.Recent,
      SavedPodSort.DateAsc,
      SavedPodSort.DateDesc,
      SavedPodSort.PriceLow,
      SavedPodSort.PriceHigh,
      SavedPodSort.NameAsc,
      SavedPodSort.NameDesc,
    ]);
    expect(SAVED_SORTS.map(([, label]) => label)).toEqual([
      'Recently saved',
      'Pod date · Soonest',
      'Pod date · Latest',
      'Price · Low to High',
      'Price · High to Low',
      'Name · A to Z',
      'Name · Z to A',
    ]);
  });

  it('lists super categories and cascades categories/subs by parent', () => {
    expect(superCategories(cats).map((c) => c.id)).toEqual(['sup']);
    expect(categoriesUnder(cats, 'sup').map((c) => c.id)).toEqual(['cat']);
    expect(categoriesUnder(cats, '')).toEqual([]);
    expect(subsUnder(cats, 'cat').map((c) => c.id)).toEqual(['sub']);
    expect(subsUnder(cats, '')).toEqual([]);
  });

  it('sends the deepest selected node as the effective category id', () => {
    expect(effectiveCategoryId(DEFAULT_SAVED_FILTERS)).toBeNull();
    expect(effectiveCategoryId(filters({ superId: 'sup' }))).toBe('sup');
    expect(effectiveCategoryId(filters({ superId: 'sup', categoryId: 'cat' }))).toBe('cat');
    expect(effectiveCategoryId(filters({ superId: 'sup', categoryId: 'cat', subId: 'sub' }))).toBe(
      'sub',
    );
  });

  it('counts each active category level', () => {
    expect(activeSavedFilterCount(DEFAULT_SAVED_FILTERS)).toBe(0);
    expect(activeSavedFilterCount(filters({ superId: 'sup' }))).toBe(1);
    expect(
      activeSavedFilterCount(filters({ superId: 'sup', categoryId: 'cat', subId: 'sub' })),
    ).toBe(3);
  });
});
