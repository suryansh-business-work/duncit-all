import { CategoryLevel } from '@/generated/graphql/graphql';
import {
  categoryChoices,
  middleCategoryId,
  subChoices,
  superChoices,
  type CategoryTreeItem,
} from '../category-tree';

const item = (
  id: string,
  name: string,
  level: CategoryLevel,
  parent_id: string | null = null,
  sort_order: number | null = null,
): CategoryTreeItem => ({ id, name, level, parent_id, sort_order });

const TREE: CategoryTreeItem[] = [
  item('s2', 'Wellness', CategoryLevel.Super, null, 2),
  item('s1', 'Sports', CategoryLevel.Super, null, 1),
  item('s3', 'Arts', CategoryLevel.Super, null, 1),
  item('c1', 'Racquet', CategoryLevel.Category, 's1', 1),
  item('c2', 'Team', CategoryLevel.Category, 's1', 2),
  item('c3', 'Yoga', CategoryLevel.Category, 's2', 1),
  item('u1', 'Badminton', CategoryLevel.Sub, 'c1', 1),
  item('u2', 'Tennis', CategoryLevel.Sub, 'c1', 2),
  item('u3', 'Football', CategoryLevel.Sub, 'c2', 1),
  item('u4', 'Hatha', CategoryLevel.Sub, 'c3', 1),
  item('u5', 'Orphan', CategoryLevel.Sub, null, 1),
];

describe('superChoices', () => {
  it('lists the super categories in admin order, then by name', () => {
    expect(superChoices(TREE)).toEqual([
      { value: 's3', label: 'Arts' },
      { value: 's1', label: 'Sports' },
      { value: 's2', label: 'Wellness' },
    ]);
  });

  it('does not reorder the tree it was given', () => {
    const copy = [...TREE];
    superChoices(copy);
    expect(copy).toEqual(TREE);
  });

  it('treats a missing sort order as zero', () => {
    const tree = [
      item('a', 'Zed', CategoryLevel.Super, null, null),
      item('b', 'Alpha', CategoryLevel.Super, null, 1),
      item('c', 'Alef', CategoryLevel.Super, null, null),
    ];
    // Zero-order entries first (by name), then the one with order 1.
    expect(superChoices(tree).map((choice) => choice.value)).toEqual(['c', 'a', 'b']);
  });

  it('is empty for an empty tree', () => {
    expect(superChoices([])).toEqual([]);
  });
});

describe('categoryChoices', () => {
  it('lists the middle categories of the chosen super only', () => {
    expect(categoryChoices(TREE, 's1')).toEqual([
      { value: 'c1', label: 'Racquet' },
      { value: 'c2', label: 'Team' },
    ]);
    expect(categoryChoices(TREE, 's2')).toEqual([{ value: 'c3', label: 'Yoga' }]);
  });

  it('is empty until a super is chosen', () => {
    expect(categoryChoices(TREE, '')).toEqual([]);
  });
});

describe('subChoices', () => {
  it('lists the subs of the chosen middle category', () => {
    expect(subChoices(TREE, 'c1', 's1')).toEqual([
      { value: 'u1', label: 'Badminton' },
      { value: 'u2', label: 'Tennis' },
    ]);
  });

  it('skips the middle level: every sub under the super while no middle is chosen', () => {
    expect(subChoices(TREE, '', 's1')).toEqual([
      { value: 'u1', label: 'Badminton' },
      { value: 'u3', label: 'Football' },
      { value: 'u2', label: 'Tennis' },
    ]);
  });

  it('leaves out subs with no parent and subs under another super', () => {
    const values = subChoices(TREE, '', 's1').map((choice) => choice.value);
    expect(values).not.toContain('u5');
    expect(values).not.toContain('u4');
  });

  it('is empty with neither a middle category nor a super', () => {
    expect(subChoices(TREE, '', '')).toEqual([]);
  });
});

describe('middleCategoryId', () => {
  it('finds the middle category a sub belongs to', () => {
    expect(middleCategoryId(TREE, 'u3')).toBe('c2');
  });

  it.each([
    ['no sub', ''],
    ['an unknown sub', 'nope'],
    ['a sub with no parent', 'u5'],
  ])('answers blank for %s', (_label, subId) => {
    expect(middleCategoryId(TREE, subId)).toBe('');
  });
});
