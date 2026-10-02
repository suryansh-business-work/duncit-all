import { describe, expect, it } from 'vitest';
import { groupCategoriesBySuper } from '../src/category-grouping';

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
