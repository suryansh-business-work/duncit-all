import { describe, expect, it } from 'vitest';
import { categoryOptions, subOptions, superOptions } from '../src/categoryOptions';
import type { CategoryDoc } from '../src/types';

const CATEGORIES: CategoryDoc[] = [
  { id: 's2', name: 'Wellness', slug: 'wellness', level: 'SUPER' },
  { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
  { id: 'c1', name: 'Painting', slug: 'painting', level: 'CATEGORY', parent_id: 's1' },
  { id: 'c2', name: 'Dance', slug: 'dance', level: 'CATEGORY', parent_id: 's1' },
  { id: 'c3', name: 'Yoga', slug: 'yoga', level: 'CATEGORY', parent_id: 's2' },
  { id: 'sub1', name: 'Watercolor', slug: 'watercolor', level: 'SUB', parent_id: 'c1' },
  { id: 'sub2', name: 'Oil', slug: 'oil', level: 'SUB', parent_id: 'c1' },
  { id: 'sub3', name: 'Hatha', slug: 'hatha', level: 'SUB', parent_id: 'c3' },
  { id: 'sub4', name: 'Orphan Sub', slug: 'orphan-sub', level: 'SUB', parent_id: null },
];

describe('superOptions', () => {
  it('returns only SUPER-level categories sorted by label', () => {
    expect(superOptions(CATEGORIES)).toEqual([
      { value: 's1', label: 'Arts' },
      { value: 's2', label: 'Wellness' },
    ]);
  });

  it('returns an empty array when no categories are given', () => {
    expect(superOptions([])).toEqual([]);
  });
});

describe('categoryOptions', () => {
  it('returns every CATEGORY-level option when no super is chosen', () => {
    expect(categoryOptions(CATEGORIES, '')).toEqual([
      { value: 'c2', label: 'Dance' },
      { value: 'c1', label: 'Painting' },
      { value: 'c3', label: 'Yoga' },
    ]);
  });

  it('restricts CATEGORY options to those under the chosen super', () => {
    expect(categoryOptions(CATEGORIES, 's1')).toEqual([
      { value: 'c2', label: 'Dance' },
      { value: 'c1', label: 'Painting' },
    ]);
  });

  it('returns an empty array when the super has no children', () => {
    expect(categoryOptions(CATEGORIES, 'no-such-super')).toEqual([]);
  });
});

describe('subOptions', () => {
  it('returns every SUB option when neither category nor super is chosen', () => {
    expect(subOptions(CATEGORIES, '', '')).toEqual([
      { value: 'sub3', label: 'Hatha' },
      { value: 'sub2', label: 'Oil' },
      { value: 'sub4', label: 'Orphan Sub' },
      { value: 'sub1', label: 'Watercolor' },
    ]);
  });

  it('restricts SUB options to the chosen category regardless of super', () => {
    expect(subOptions(CATEGORIES, 'c1', '')).toEqual([
      { value: 'sub2', label: 'Oil' },
      { value: 'sub1', label: 'Watercolor' },
    ]);
  });

  it('falls back to every sub under the super when no category is chosen', () => {
    expect(subOptions(CATEGORIES, '', 's1')).toEqual([
      { value: 'sub2', label: 'Oil' },
      { value: 'sub1', label: 'Watercolor' },
    ]);
  });

  it('excludes subs whose parent category is unrelated to the chosen super', () => {
    expect(subOptions(CATEGORIES, '', 's2')).toEqual([{ value: 'sub3', label: 'Hatha' }]);
  });

  it('excludes subs with no parent_id when only a super is chosen', () => {
    // sub4 has parent_id: null, so it can never match middleIdsForSuper.
    const result = subOptions(CATEGORIES, '', 's1');
    expect(result.find((option) => option.value === 'sub4')).toBeUndefined();
  });

  it('returns an empty array when the chosen category has no subs', () => {
    expect(subOptions(CATEGORIES, 'c2', '')).toEqual([]);
  });
});
