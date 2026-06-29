import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useSearchCategories, useSearchDiscovery, useSearchSuggestions } from '@/hooks/useSearch';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const clubResult = (id: string) => ({
  is_following: false,
  participant_count: 0,
  next_pod_date: null,
  club: { id, club_id: id, club_name: id, followers_count: 0 },
  upcoming_pods: [],
});

const discovery = (happening: unknown[], more: unknown[] = []) => ({
  searchDiscovery: { query: 'q', happening, more_clubs: more },
});

describe('useSearchDiscovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRequest.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('stays inactive and skips the server with no query and no category', () => {
    const { result } = renderHook(() => useSearchDiscovery('   ', ''));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.active).toBe(false);
    expect(result.current.happening).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('debounces then fetches grouped clubs for a query', async () => {
    mockRequest.mockResolvedValue(discovery([clubResult('h1')], [clubResult('m1')]));
    const { result } = renderHook(() => useSearchDiscovery('badminton', ''));
    expect(result.current.loading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { input: { query: 'badminton', category_id: undefined } },
      { auth: true },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.happening.map((r) => r.club.id)).toEqual(['h1']);
    expect(result.current.moreClubs.map((r) => r.club.id)).toEqual(['m1']);
  });

  it('searches by category only when there is no query text', async () => {
    mockRequest.mockResolvedValue(discovery([clubResult('h1')]));
    const { result } = renderHook(() => useSearchDiscovery('', 'cat-1'));
    expect(result.current.active).toBe(true);
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { input: { query: undefined, category_id: 'cat-1' } },
      { auth: true },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('keeps only the latest result when the query changes mid-flight', async () => {
    mockRequest
      .mockResolvedValueOnce(discovery([clubResult('old')]))
      .mockResolvedValueOnce(discovery([clubResult('new')]));
    const { result, rerender } = renderHook(
      (props: { q: string }) => useSearchDiscovery(props.q, ''),
      {
        initialProps: { q: 'ba' },
      },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.happening.map((r) => r.club.id)).toEqual(['new']);
  });

  it('ignores a stale failure after the query changes', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(discovery([clubResult('new')]));
    const { result, rerender } = renderHook(
      (props: { q: string }) => useSearchDiscovery(props.q, ''),
      {
        initialProps: { q: 'ba' },
      },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.happening.map((r) => r.club.id)).toEqual(['new']);
  });

  it('clears results when the search fails', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSearchDiscovery('badminton', ''));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.happening).toEqual([]);
  });

  it('re-runs the query when refetch is called', async () => {
    mockRequest.mockResolvedValue(discovery([clubResult('h1')]));
    const { result } = renderHook(() => useSearchDiscovery('badminton', ''));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.refetch());
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
  });
});

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRequest.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('returns nothing for fewer than two characters', () => {
    const { result } = renderHook(() => useSearchSuggestions('a'));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('debounces then returns suggestions', async () => {
    mockRequest.mockResolvedValue({ searchSuggestions: [{ text: 'Badminton', kind: 'CLUB' }] });
    const { result } = renderHook(() => useSearchSuggestions('bad'));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.text).toBe('Badminton');
  });

  it('drops a stale success after the query changes', async () => {
    mockRequest
      .mockResolvedValueOnce({ searchSuggestions: [{ text: 'Old', kind: 'CLUB' }] })
      .mockResolvedValueOnce({ searchSuggestions: [{ text: 'New', kind: 'CLUB' }] });
    const { result, rerender } = renderHook(
      (props: { q: string }) => useSearchSuggestions(props.q),
      {
        initialProps: { q: 'ba' },
      },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.map((s) => s.text)).toEqual(['New']));
  });

  it('drops a stale failure and clears on a live failure', async () => {
    mockRequest.mockRejectedValueOnce(new Error('stale')).mockRejectedValueOnce(new Error('live'));
    const { result, rerender } = renderHook(
      (props: { q: string }) => useSearchSuggestions(props.q),
      {
        initialProps: { q: 'ba' },
      },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current).toEqual([]));
  });
});

describe('useSearchCategories', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRequest.mockReset();
  });

  const cats = [
    { id: 'c1', name: 'Sports', slug: 'sports', icon: '🏸', level: 'CATEGORY', parent_id: null },
    { id: 's1', name: 'Top', slug: 'top', icon: null, level: 'SUPER', parent_id: null },
  ];

  it('fetches categories and prefers CATEGORY-level buttons', async () => {
    mockRequest.mockResolvedValue({ categories: cats });
    const { result } = renderHook(() => useSearchCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    expect(result.current.categories[0]?.id).toBe('c1');
  });

  it('falls back to SUPER-level buttons when no CATEGORY exists', async () => {
    mockRequest.mockResolvedValue({ categories: [cats[1]] });
    const { result } = renderHook(() => useSearchCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    expect(result.current.categories[0]?.id).toBe('s1');
  });

  it('resolves a club category name by leaf id, then super id, else null', async () => {
    mockRequest.mockResolvedValue({ categories: cats });
    const { result } = renderHook(() => useSearchCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    expect(result.current.nameOf({ category_id: 'c1' })).toBe('Sports');
    expect(result.current.nameOf({ category_id: 'x', super_category_id: 's1' })).toBe('Top');
    expect(result.current.nameOf({ category_id: null, super_category_id: 'x' })).toBeNull();
  });

  it('falls back to an empty list when the request fails', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSearchCategories());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current.categories).toEqual([]);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolveFn: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const { unmount } = renderHook(() => useSearchCategories());
    unmount();
    await act(async () => {
      resolveFn({ categories: cats });
    });
    expect(mockRequest).toHaveBeenCalled();
  });

  it('ignores a rejection that settles after unmount', async () => {
    let rejectFn: (reason: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFn = reject;
      }),
    );
    const { unmount } = renderHook(() => useSearchCategories());
    unmount();
    await act(async () => {
      rejectFn(new Error('late'));
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
