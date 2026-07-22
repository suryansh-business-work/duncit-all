import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { SEARCH_DISCOVERY, SEARCH_CATEGORIES } from '../queries';
import {
  useSearchDiscovery,
  useSearchCategories,
  scopeCategoryButtons,
} from '../useSearchDiscovery';

const DISCOVERY_RESULT = {
  searchDiscovery: {
    query: 'run',
    happening: [{ club: { id: 'c1' } }],
    more_clubs: [{ club: { id: 'c2' } }, { club: { id: 'c3' } }],
  },
};

function discoveryMock(query?: string, categoryId?: string) {
  return {
    request: {
      query: SEARCH_DISCOVERY,
      variables: { input: { query: query || undefined, category_id: categoryId || undefined } },
    },
    result: { data: DISCOVERY_RESULT },
  };
}

const CATEGORIES = [
  { id: 'sup1', name: 'Sports', slug: 'sports', icon: null, level: 'SUPER', parent_id: null },
  { id: 'cat1', name: 'Racquet', slug: 'racquet', icon: 'r', level: 'CATEGORY', parent_id: 'sup1' },
  { id: 'sub1', name: 'Badminton', slug: 'badminton', icon: null, level: 'SUB', parent_id: 'cat1' },
];

function categoriesMock(categories: any[]) {
  return {
    request: { query: SEARCH_CATEGORIES },
    result: { data: { categories } },
  };
}

function wrapperWith(mocks: any[]) {
  return ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
}

describe('useSearchDiscovery', () => {
  it('is inactive and returns empty arrays when there is nothing to search', () => {
    const { result } = renderHook(() => useSearchDiscovery('', ''), {
      wrapper: wrapperWith([]),
    });
    expect(result.current.active).toBe(false);
    expect(result.current.happening).toEqual([]);
    expect(result.current.moreClubs).toEqual([]);
    expect(typeof result.current.refetch).toBe('function');
  });

  it('fires the query with a text query and returns grouped results', async () => {
    const { result } = renderHook(() => useSearchDiscovery('run', ''), {
      wrapper: wrapperWith([discoveryMock('run', '')]),
    });
    expect(result.current.active).toBe(true);
    await waitFor(() => expect(result.current.happening).toHaveLength(1));
    expect(result.current.moreClubs).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('is active when only a category is selected', async () => {
    const { result } = renderHook(() => useSearchDiscovery('', 'cat1'), {
      wrapper: wrapperWith([discoveryMock('', 'cat1')]),
    });
    expect(result.current.active).toBe(true);
    await waitFor(() => expect(result.current.happening).toHaveLength(1));
  });
});

describe('useSearchCategories', () => {
  it('returns empty defaults before data loads', () => {
    const { result } = renderHook(() => useSearchCategories(), {
      wrapper: wrapperWith([categoriesMock(CATEGORIES)]),
    });
    expect(result.current.all).toEqual([]);
    expect(result.current.buttons).toEqual([]);
  });

  it('prefers CATEGORY-level buttons and resolves names', async () => {
    const { result } = renderHook(() => useSearchCategories(), {
      wrapper: wrapperWith([categoriesMock(CATEGORIES)]),
    });
    await waitFor(() => expect(result.current.all).toHaveLength(3));
    expect(result.current.buttons.map((b) => b.id)).toEqual(['cat1']);

    // nameOf: category_id hit, super_category_id hit, and no match
    expect(result.current.nameOf({ category_id: 'sub1' })).toBe('Badminton');
    expect(result.current.nameOf({ super_category_id: 'sup1' })).toBe('Sports');
    expect(result.current.nameOf({ category_id: 'nope' })).toBeNull();

    // matchesCategory descends the tree
    expect(result.current.matchesCategory({ category_id: 'sub1' }, 'sup1')).toBe(true);
    expect(result.current.matchesCategory({ category_id: 'sub1' }, '')).toBe(true);
  });

  it('falls back to SUPER-level buttons when there are no CATEGORY nodes', async () => {
    const onlySupers = [CATEGORIES[0], { ...CATEGORIES[2], level: 'SUB' }];
    const { result } = renderHook(() => useSearchCategories(), {
      wrapper: wrapperWith([categoriesMock(onlySupers)]),
    });
    await waitFor(() => expect(result.current.all).toHaveLength(2));
    expect(result.current.buttons.map((b) => b.id)).toEqual(['sup1']);
  });
});

describe('scopeCategoryButtons', () => {
  const buttons = [
    { id: 'cat1', parent_id: 'sup1' },
    { id: 'cat2', parent_id: 'sup2' },
  ];
  const all = [
    { id: 'sup1', parent_id: null },
    { id: 'sup2', parent_id: null },
    { id: 'cat1', parent_id: 'sup1' },
    { id: 'cat2', parent_id: 'sup2' },
  ];

  it('returns all buttons when no super is selected', () => {
    expect(scopeCategoryButtons(buttons, all)).toBe(buttons);
    expect(scopeCategoryButtons(buttons, all, null)).toBe(buttons);
  });

  it('keeps only buttons descending from the selected super', () => {
    expect(scopeCategoryButtons(buttons, all, 'sup1').map((b) => b.id)).toEqual(['cat1']);
  });

  it('excludes buttons whose ancestry does not reach the super', () => {
    expect(scopeCategoryButtons(buttons, all, 'ghost')).toEqual([]);
  });
});
