import { makeCategoryMatcher } from '@/utils/category-match';

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
