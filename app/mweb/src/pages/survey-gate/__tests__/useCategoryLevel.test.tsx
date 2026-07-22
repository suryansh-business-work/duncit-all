import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCategoryLevel } from '../useCategoryLevel';
import { CATEGORIES, type CategoryOption } from '../queries';

const makeWrapper =
  (mocks: readonly object[]) =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );

const cat = (over: Partial<CategoryOption>): CategoryOption => ({
  id: 'x',
  name: 'X',
  level: 'SUPER',
  parent_id: null,
  is_active: true,
  sort_order: 0,
  ...over,
});

describe('useCategoryLevel', () => {
  it('fetches SUPER level with null parent, filters inactive, and sorts by sort_order then name', async () => {
    const categories: CategoryOption[] = [
      cat({ id: 'b', name: 'Bravo', sort_order: 2 }),
      cat({ id: 'a', name: 'Alpha', sort_order: 1 }),
      cat({ id: 'd', name: 'Delta', sort_order: 1 }),
      cat({ id: 'c', name: 'Charlie', sort_order: 1, is_active: false }),
    ];
    const mocks = [
      {
        request: { query: CATEGORIES, variables: { level: 'SUPER', parent_id: null } },
        result: { data: { categories } },
      },
    ];

    const { result } = renderHook(() => useCategoryLevel('SUPER', ''), {
      wrapper: makeWrapper(mocks),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // inactive 'Charlie' filtered out; sort_order 1 group sorted by name (Alpha, Delta), then Bravo
    expect(result.current.options.map((o) => o.id)).toEqual(['a', 'd', 'b']);
  });

  it('skips the query for non-SUPER level without a parentId and returns empty options', async () => {
    const { result } = renderHook(() => useCategoryLevel('CATEGORY', ''), {
      wrapper: makeWrapper([]),
    });

    // skipped -> no loading, empty options
    expect(result.current.loading).toBe(false);
    expect(result.current.options).toEqual([]);
  });

  it('fetches non-SUPER level using the provided parentId', async () => {
    const categories: CategoryOption[] = [
      cat({ id: 's1', name: 'Sub One', level: 'SUB', parent_id: 'p1' }),
    ];
    const mocks = [
      {
        request: { query: CATEGORIES, variables: { level: 'SUB', parent_id: 'p1' } },
        result: { data: { categories } },
      },
    ];

    const { result } = renderHook(() => useCategoryLevel('SUB', 'p1'), {
      wrapper: makeWrapper(mocks),
    });

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0].id).toBe('s1');
  });

  it('treats missing sort_order as 0 and handles an empty/undefined categories payload', async () => {
    const mocks = [
      {
        request: { query: CATEGORIES, variables: { level: 'SUPER', parent_id: null } },
        result: { data: { categories: null } },
      },
    ];

    const { result } = renderHook(() => useCategoryLevel('SUPER', ''), {
      wrapper: makeWrapper(mocks),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
  });
});
