import { categoryPath, makeCategoryMatcher } from '@/utils/category-match';

// super › category › sub tree
const categories = [
  { id: 'super', parent_id: null },
  { id: 'cat', parent_id: 'super' },
  { id: 'sub', parent_id: 'cat' },
  { id: 'other', parent_id: 'super' },
];

describe('makeCategoryMatcher', () => {
  const match = makeCategoryMatcher(categories);

  it('matches everything when no category is selected', () => {
    expect(match({ category_id: 'sub' }, '')).toBe(true);
    expect(match(null, '')).toBe(true);
  });

  it('never matches a missing club once a category is selected', () => {
    expect(match(null, 'cat')).toBe(false);
    expect(match(undefined, 'cat')).toBe(false);
  });

  it('matches on an exact category or super-category hit', () => {
    expect(match({ category_id: 'cat' }, 'cat')).toBe(true);
    expect(match({ category_id: 'x', super_category_id: 'super' }, 'super')).toBe(true);
  });

  it('matches a SUB-tagged club against its ancestor CATEGORY chip', () => {
    // The "All {category}" case: chip = CATEGORY, club tagged at SUB descendant.
    expect(match({ category_id: 'sub' }, 'cat')).toBe(true);
  });

  it('matches a CATEGORY-tagged club against a descendant SUB chip', () => {
    expect(match({ category_id: 'cat' }, 'sub')).toBe(true);
  });

  it('rejects clubs on a different branch', () => {
    expect(match({ category_id: 'other' }, 'cat')).toBe(false);
    expect(match({ category_id: null, super_category_id: null }, 'cat')).toBe(false);
  });
});

describe('categoryPath', () => {
  const named = [
    { id: 'super', name: 'Sports', parent_id: null },
    { id: 'cat', name: 'Racquet', parent_id: 'super' },
    { id: 'sub', name: 'Badminton', parent_id: 'cat' },
  ];

  it('builds the full Super › Category › Sub path from a leaf sub', () => {
    expect(categoryPath(named, 'super', 'sub')).toEqual(['Sports', 'Racquet', 'Badminton']);
  });

  it('walks the chain even without a super id', () => {
    expect(categoryPath(named, null, 'sub')).toEqual(['Sports', 'Racquet', 'Badminton']);
  });

  it('does not duplicate the super when the leaf already is the super', () => {
    expect(categoryPath(named, 'super', 'super')).toEqual(['Sports']);
  });

  it('prepends the super when the leaf chain never reaches it', () => {
    const orphan = [
      { id: 'super', name: 'Sports', parent_id: null },
      { id: 'sub', name: 'Badminton', parent_id: 'missing' },
    ];
    expect(categoryPath(orphan, 'super', 'sub')).toEqual(['Sports', 'Badminton']);
  });

  it('returns [] for an empty/nullish tree, blank ids or unknown ids', () => {
    expect(categoryPath([], 'super', 'sub')).toEqual([]);
    expect(categoryPath(null, 'super', 'sub')).toEqual([]);
    expect(categoryPath(named, '', '')).toEqual([]);
    expect(categoryPath(named, 'nope', 'nope')).toEqual([]);
  });

  it('stops at the hop guard on a cyclic tree', () => {
    const cyclic = [
      { id: 'a', name: 'A', parent_id: 'b' },
      { id: 'b', name: 'B', parent_id: 'a' },
    ];
    expect(categoryPath(cyclic, null, 'a')).toHaveLength(16);
  });
});
