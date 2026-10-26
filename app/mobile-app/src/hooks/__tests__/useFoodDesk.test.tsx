import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFoodDeskList, useFoodDeskVenues, useFoodStats } from '@/hooks/useFoodDesk';
import { fetchFoodOwnerVenues, fetchFoodStats } from '@/services/venue-food-owner';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useSelectedVenue', () => ({
  useSelectedVenue: (venues: { id: string }[]) => ({
    venue: venues[0] ?? null,
    venueId: venues[0]?.id ?? null,
    selectVenue: jest.fn(),
  }),
}));
jest.mock('@/services/venue-food-owner', () => ({
  fetchFoodOwnerVenues: jest.fn(),
  fetchFoodStats: jest.fn(),
}));

interface Row {
  id: string;
  label: string;
}

const row = (id: string, label = id): Row => ({ id, label });
const venuesMock = jest.mocked(fetchFoodOwnerVenues);
const statsMock = jest.mocked(fetchFoodStats);

beforeEach(() => jest.clearAllMocks());

describe('useFoodDeskVenues', () => {
  it('lists the owner venues from the food-owner query and picks the first', async () => {
    venuesMock.mockResolvedValue([{ id: 'v1', venue_name: 'A', offers_food: true }] as never);
    const { result } = renderHook(() => useFoodDeskVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venues).toHaveLength(1);
    expect(result.current.venueId).toBe('v1');
    expect(result.current.error).toBeNull();
  });

  it('keeps the error instead of an empty list when the venues do not arrive', async () => {
    venuesMock.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useFoodDeskVenues());
    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.venues).toEqual([]);
  });
});

describe('useFoodDeskList', () => {
  const firstPage = { rows: [row('a'), row('b')], total: 3 };
  const fetchPage = jest.fn();

  beforeEach(() => fetchPage.mockReset());

  it('loads the first page newest first and says whether more is waiting', async () => {
    fetchPage.mockResolvedValue(firstPage);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPage).toHaveBeenCalledWith('v1', {
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_dir: 'desc',
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('asks for nothing without a venue and stays loading', () => {
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, null));
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('ignores a pull-to-refresh while there is no venue', async () => {
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, null));
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
  });

  it('appends the next page, replacing rows already on screen', async () => {
    fetchPage.mockResolvedValueOnce(firstPage);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    fetchPage.mockResolvedValueOnce({ rows: [row('b', 'b2'), row('c')], total: 3 });
    await act(async () => result.current.loadMore());
    expect(fetchPage).toHaveBeenLastCalledWith('v1', expect.objectContaining({ page: 2 }));
    expect(result.current.rows).toEqual([row('a'), row('b', 'b2'), row('c')]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadingMore).toBe(false);
  });

  it('reports a failed load-more and keeps the rows', async () => {
    fetchPage.mockResolvedValueOnce(firstPage);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    fetchPage.mockRejectedValueOnce(new Error('boom'));
    await act(async () => result.current.loadMore());
    expect(result.current.error).toBe('boom');
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.loadingMore).toBe(false);
  });

  it('does not load more without a venue', async () => {
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, null));
    await act(async () => result.current.loadMore());
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.loadingMore).toBe(false);
  });

  it('reports a failed first load with the generic sentence when the error has no message', async () => {
    fetchPage.mockRejectedValue(undefined);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    await waitFor(() => expect(result.current.error).toBe('mweb.account.somethingWentWrong'));
    expect(result.current.isLoading).toBe(false);
  });

  it('starts again at the first page on a refetch and clears the error', async () => {
    fetchPage.mockResolvedValueOnce(firstPage);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    fetchPage.mockRejectedValueOnce(new Error('boom'));
    await act(async () => result.current.loadMore());
    expect(result.current.error).toBe('boom');
    fetchPage.mockResolvedValueOnce({ rows: [row('z')], total: 1 });
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchPage).toHaveBeenLastCalledWith('v1', expect.objectContaining({ page: 1 }));
    expect(result.current.rows).toEqual([row('z')]);
    expect(result.current.error).toBeNull();
  });

  it('repaints one row from a mutation answer, or appends it when it is new', async () => {
    fetchPage.mockResolvedValueOnce(firstPage);
    const { result } = renderHook(() => useFoodDeskList<Row>(fetchPage, 'v1'));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    act(() => result.current.replaceRow(row('a', 'changed')));
    expect(result.current.rows).toEqual([row('a', 'changed'), row('b')]);
    act(() => result.current.replaceRow(row('n')));
    expect(result.current.rows.map((r) => r.id)).toEqual(['a', 'b', 'n']);
  });
});

describe('useFoodStats', () => {
  it('reads the venue numbers for the picked period', async () => {
    statsMock.mockResolvedValue({ orders: 4 } as never);
    const { result, rerender } = renderHook(
      ({ days }: { days: number }) => useFoodStats('v1', days),
      { initialProps: { days: 7 } },
    );
    await waitFor(() => expect(result.current.stats).toEqual({ orders: 4 }));
    expect(statsMock).toHaveBeenCalledWith('v1', 7);
    statsMock.mockResolvedValue({ orders: 9 } as never);
    rerender({ days: 0 });
    await waitFor(() => expect(result.current.stats).toEqual({ orders: 9 }));
    expect(statsMock).toHaveBeenLastCalledWith('v1', 0);
    expect(result.current.error).toBeNull();
  });

  it('asks for nothing without a venue', () => {
    const { result } = renderHook(() => useFoodStats(null, 7));
    expect(statsMock).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
  });

  it('ignores a pull-to-refresh while there is no venue', async () => {
    const { result } = renderHook(() => useFoodStats(null, 7));
    await act(async () => {
      await result.current.refetch();
    });
    expect(statsMock).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
  });

  it('reports a failed read and keeps no stats', async () => {
    statsMock.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useFoodStats('v1', 7));
    await waitFor(() => expect(result.current.error).toBe('nope'));
    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
