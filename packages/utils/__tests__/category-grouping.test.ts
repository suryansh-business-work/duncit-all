import { describe, expect, it } from 'vitest';
import { activeCategories, groupCategoriesBySuper } from '../src/category-grouping';

const all = [
  { id: 'sup-sports', name: 'Sports', level: 'SUPER', parent_id: null },
  { id: 'cat-badminton', name: 'Badminton', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sup-arts', name: 'Arts', level: 'SUPER' },
  { id: 'sub-doubles', name: 'Doubles', level: 'SUB', parent_id: 'cat-badminton' },
  { id: 'cat-running', name: 'Running', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sup-empty', name: 'Wellness', level: 'SUPER' },
  { id: 'cat-pottery', name: 'Pottery', level: 'CATEGORY', parent_id: 'sup-arts' },
  { id: 'cat-orphan', name: 'Chess', level: 'CATEGORY', parent_id: 'sup-gone' },
  { id: 'cat-rootless', name: 'Quiz', level: 'CATEGORY' },
];

describe('groupCategoriesBySuper', () => {
  it('nests each CATEGORY under its SUPER, keeping arrival order', () => {
    const groups = groupCategoriesBySuper(all);
    expect(groups.map((group) => group.superCategory.id)).toEqual(['sup-sports', 'sup-arts']);
    expect(groups[0].categories.map((item) => item.id)).toEqual(['cat-badminton', 'cat-running']);
    expect(groups[1].categories.map((item) => item.id)).toEqual(['cat-pottery']);
  });

  it('drops empty supers, SUB rows and categories without a known super', () => {
    const ids = groupCategoriesBySuper(all).flatMap((group) => [
      group.superCategory.id,
      ...group.categories.map((item) => item.id),
    ]);
    expect(ids).not.toContain('sup-empty');
    expect(ids).not.toContain('sub-doubles');
    expect(ids).not.toContain('cat-orphan');
    expect(ids).not.toContain('cat-rootless');
  });

  it('returns no groups for no categories', () => {
    expect(groupCategoriesBySuper([])).toEqual([]);
  });
});

describe('activeCategories', () => {
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

  it('drops a category the admin switched to inactive', () => {
    const rows = [
      { id: 'cat-outdoors', parent_id: 'sup-for-you', is_active: false },
      { id: 'cat-music', parent_id: 'sup-for-you', is_active: true },
    ];
    expect(ids(activeCategories(rows))).toEqual(['cat-music']);
  });

  it('hides every SUB under an inactive CATEGORY, and everything under an inactive SUPER', () => {
    const rows = [
      { id: 'sup-pets', parent_id: null, is_active: false },
      { id: 'cat-walks', parent_id: 'sup-pets', is_active: true },
      { id: 'sup-for-you', parent_id: null, is_active: true },
      { id: 'cat-outdoors', parent_id: 'sup-for-you', is_active: false },
      { id: 'sub-trek', parent_id: 'cat-outdoors', is_active: true },
      { id: 'cat-music', parent_id: 'sup-for-you', is_active: true },
      { id: 'sub-jam', parent_id: 'cat-music', is_active: true },
    ];
    expect(ids(activeCategories(rows))).toEqual(['sup-for-you', 'cat-music', 'sub-jam']);
  });

  it('treats a missing is_active and an unknown parent as visible', () => {
    const rows = [
      { id: 'cat-legacy', parent_id: 'sup-for-you' },
      { id: 'cat-unset', parent_id: null, is_active: null },
      { id: 'cat-orphan', parent_id: 'sup-gone', is_active: true },
    ];
    expect(ids(activeCategories(rows))).toEqual(['cat-legacy', 'cat-unset', 'cat-orphan']);
  });

  it('stops walking a corrupt parent cycle instead of looping forever', () => {
    const rows = [
      { id: 'a', parent_id: 'b', is_active: true },
      { id: 'b', parent_id: 'a', is_active: true },
    ];
    expect(ids(activeCategories(rows))).toEqual(['a', 'b']);
  });

  it('returns nothing for no categories', () => {
    expect(activeCategories([])).toEqual([]);
  });
});
