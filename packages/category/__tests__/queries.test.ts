import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { useAdminCategories, ADMIN_CATEGORIES } = await import('../src/queries');

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('ADMIN_CATEGORIES', () => {
  it('builds the query document via gql', () => {
    expect(ADMIN_CATEGORIES).toBeDefined();
  });
});

describe('useAdminCategories', () => {
  it('returns categories, loading and error passed through from useQuery', () => {
    const error = new Error('network down');
    useQueryMock.mockReturnValue({
      data: { categories: [{ id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' }] },
      loading: false,
      error,
    });
    const { result } = renderHook(() => useAdminCategories());
    expect(result.current.categories).toEqual([{ id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
    expect(useQueryMock).toHaveBeenCalledWith(ADMIN_CATEGORIES, { fetchPolicy: 'cache-first' });
  });

  it('treats absent data as an empty category list', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });
    const { result } = renderHook(() => useAdminCategories());
    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeUndefined();
  });
});
