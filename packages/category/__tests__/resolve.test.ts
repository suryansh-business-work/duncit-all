import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { buildCategoryValue, useCategoryValue } = await import('../src/resolve');
const { EMPTY_CATEGORY } = await import('../src/types');

const CATEGORIES: Array<{
  id: string;
  name: string;
  slug: string;
  level: 'SUPER' | 'CATEGORY' | 'SUB';
  parent_id?: string | null;
}> = [
  { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
  { id: 'c1', name: 'Painting', slug: 'painting', level: 'CATEGORY', parent_id: 's1' },
  { id: 'sub1', name: 'Watercolor', slug: 'watercolor', level: 'SUB', parent_id: 'c1' },
  { id: 'sub2', name: 'No Parent Sub', slug: 'no-parent-sub', level: 'SUB', parent_id: null },
];

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('buildCategoryValue', () => {
  it('resolves the full super/category/sub chain from a sub id', () => {
    expect(buildCategoryValue(CATEGORIES, 's1', 'sub1')).toEqual({
      super_id: 's1',
      super_name: 'Arts',
      category_id: 'c1',
      category_name: 'Painting',
      sub_id: 'sub1',
      sub_name: 'Watercolor',
    });
  });

  it('falls back to the raw super id and empty names when the super is not found', () => {
    expect(buildCategoryValue(CATEGORIES, 'missing-super', '')).toEqual({
      super_id: 'missing-super',
      super_name: '',
      category_id: '',
      category_name: '',
      sub_id: '',
      sub_name: '',
    });
  });

  it('leaves category/sub empty when the sub id is not found', () => {
    expect(buildCategoryValue(CATEGORIES, 's1', 'missing-sub')).toEqual({
      super_id: 's1',
      super_name: 'Arts',
      category_id: '',
      category_name: '',
      sub_id: '',
      sub_name: '',
    });
  });

  it('leaves category empty when the found sub has no parent_id', () => {
    expect(buildCategoryValue(CATEGORIES, '', 'sub2')).toEqual({
      super_id: '',
      super_name: '',
      category_id: '',
      category_name: '',
      sub_id: 'sub2',
      sub_name: 'No Parent Sub',
    });
  });

  it('falls back to an empty string when the super id itself is nullish', () => {
    // Runtime callers (e.g. a stale hook) may pass undefined despite the string type.
    expect(buildCategoryValue(CATEGORIES, undefined as unknown as string, '').super_id).toBe('');
  });
});

describe('useCategoryValue', () => {
  it('returns EMPTY_CATEGORY when neither super nor sub id is given', () => {
    useQueryMock.mockReturnValue({ data: { categories: CATEGORIES }, loading: false });
    const { result } = renderHook(() => useCategoryValue());
    expect(result.current).toEqual(EMPTY_CATEGORY);
  });

  it('returns EMPTY_CATEGORY when both ids are explicitly null', () => {
    useQueryMock.mockReturnValue({ data: { categories: CATEGORIES }, loading: false });
    const { result } = renderHook(() => useCategoryValue(null, null));
    expect(result.current).toEqual(EMPTY_CATEGORY);
  });

  it('hydrates a full value once a super id or sub id is provided', () => {
    useQueryMock.mockReturnValue({ data: { categories: CATEGORIES }, loading: false });
    const { result } = renderHook(() => useCategoryValue('s1', 'sub1'));
    expect(result.current).toEqual({
      super_id: 's1',
      super_name: 'Arts',
      category_id: 'c1',
      category_name: 'Painting',
      sub_id: 'sub1',
      sub_name: 'Watercolor',
    });
  });

  it('hydrates from a sub id alone when the super id is nullish', () => {
    useQueryMock.mockReturnValue({ data: { categories: CATEGORIES }, loading: false });
    const { result } = renderHook(() => useCategoryValue(undefined, 'sub1'));
    expect(result.current).toEqual({
      super_id: '',
      super_name: '',
      category_id: 'c1',
      category_name: 'Painting',
      sub_id: 'sub1',
      sub_name: 'Watercolor',
    });
  });

  it('treats an absent categories list as empty', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    const { result } = renderHook(() => useCategoryValue('s1', undefined));
    expect(result.current.super_id).toBe('s1');
    expect(result.current.super_name).toBe('');
  });
});
