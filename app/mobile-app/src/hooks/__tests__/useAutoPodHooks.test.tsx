import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AutoPodHostProjectionDocument, MyVenuesForAutoPodDocument } from '@/graphql/auto-pods';
import { useAutoPodCounts } from '@/hooks/useAutoPodCounts';
import { useAutoPodEarnings } from '@/hooks/useAutoPodEarnings';
import { useAutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';
import { useAutoPodPricing } from '@/hooks/useAutoPodPricing';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { useAutoPodVenues } from '@/hooks/useAutoPodVenues';
import { useAutoPods } from '@/hooks/useAutoPods';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { graphqlRequest } from '@/services/graphql.client';
import { useAutoPodCountsStore } from '@/stores/auto-pod-counts.store';
import { makeAutoPodRow } from '@/utils/auto-pod-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: jest.fn() }));
jest.mock('@/hooks/useAutoPods', () => ({ useAutoPods: jest.fn() }));
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (iso: string) => `at ${iso}` }),
}));
jest.mock('@/hooks/usePublicFinance', () => ({ usePublicFinance: () => ({ currency: '$' }) }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const mockRefresh = jest.fn();
jest.mock('@/components/PullToRefresh', () => ({
  useRefreshRegistration: (handler: () => void) => mockRefresh(handler),
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const flag = jest.mocked(useFeatureFlag);
const queue = jest.mocked(useAutoPods);

const projection = (over: Record<string, unknown> = {}) => ({
  min_spots: 3,
  max_spots: 12,
  pod_amount: 200,
  no_of_spots: 5,
  total_collection: 1000,
  gst_amount: 0,
  platform_fee_amount: 0,
  venue_amount: 300,
  club_admin_amount: 100,
  host_receives: 450,
  viable: true,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  useAutoPodCountsStore.setState({ data: undefined, isLoading: false });
});

describe('useAutoPodHostProjection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each([
    ['no offer', null, 200, 5],
    ['no price', 'ap1', 0, 5],
    ['no spots', 'ap1', 200, 0],
  ])('prices nothing with %s', (_name, id, amount, spots) => {
    const { result } = renderHook(() => useAutoPodHostProjection(id, amount, spots));
    act(() => jest.advanceTimersByTime(1000));
    expect(request).not.toHaveBeenCalled();
    expect(result.current).toEqual({ projection: null, failed: false, loading: false });
  });

  it('is loading from the keystroke, and asks the server once after the debounce', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection() });
    const { result } = renderHook(() => useAutoPodHostProjection('ap1', 200, 5));
    expect(result.current.loading).toBe(true);
    expect(request).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      AutoPodHostProjectionDocument,
      { auto_pod_doc_id: 'ap1', pod_amount: 200, no_of_spots: 5 },
      { auth: true },
    );
    expect(result.current.projection).toEqual(projection());
    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('prices a price typed digit by digit only once', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection() });
    const { rerender } = renderHook(
      ({ amount }: { amount: number }) => useAutoPodHostProjection('ap1', amount, 5),
      { initialProps: { amount: 2 } },
    );
    act(() => jest.advanceTimersByTime(200));
    rerender({ amount: 20 });
    act(() => jest.advanceTimersByTime(200));
    rerender({ amount: 200 });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[1]).toMatchObject({ pod_amount: 200 });
  });

  it('says the read failed and clears the figures', async () => {
    request.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAutoPodHostProjection('ap1', 200, 5));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current).toEqual({ projection: null, failed: true, loading: false });
  });

  it('recovers from a failure on the next successful read', async () => {
    request.mockRejectedValueOnce(new Error('boom'));
    request.mockResolvedValueOnce({ autoPodHostProjection: projection() });
    const { result, rerender } = renderHook(
      ({ spots }: { spots: number }) => useAutoPodHostProjection('ap1', 200, spots),
      { initialProps: { spots: 5 } },
    );
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.failed).toBe(true);
    rerender({ spots: 6 });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.failed).toBe(false);
    expect(result.current.projection).not.toBeNull();
  });

  it('drops an answer that lands after the inputs changed away', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const { result, unmount } = renderHook(() => useAutoPodHostProjection('ap1', 200, 5));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    unmount();
    await act(async () => finish({ autoPodHostProjection: projection() }));
    expect(result.current.projection).toBeNull();
  });

  it('drops a failure that lands after the screen is gone', async () => {
    let fail: (reason: unknown) => void = () => undefined;
    request.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
    const { result, unmount } = renderHook(() => useAutoPodHostProjection('ap1', 200, 5));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    unmount();
    await act(async () => fail(new Error('late')));
    expect(result.current.failed).toBe(false);
  });
});

describe('useAutoPodPricing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is empty for no offer', () => {
    const { result } = renderHook(() => useAutoPodPricing(null));
    expect(result.current).toMatchObject({
      price: '',
      spots: 0,
      amount: 0,
      projection: null,
      inRange: false,
      viable: false,
    });
  });

  it('seeds the price and spots from the offer', () => {
    request.mockResolvedValue({ autoPodHostProjection: projection() });
    const row = makeAutoPodRow({ pod_amount: 200, no_of_spots: 5 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    expect(result.current.price).toBe('200');
    expect(result.current.amount).toBe(200);
    expect(result.current.spots).toBe(5);
  });

  it('leaves the price blank for an offer nobody has priced', () => {
    const row = makeAutoPodRow({ pod_amount: 0, no_of_spots: 0 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    expect(result.current.price).toBe('');
    expect(result.current.amount).toBe(0);
  });

  it('is viable when the server says so and the spots sit in its range', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection() });
    const row = makeAutoPodRow({ pod_amount: 200, no_of_spots: 5 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.inRange).toBe(true);
    expect(result.current.viable).toBe(true);
  });

  it('is not viable when the server says the numbers do not work', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection({ viable: false }) });
    const row = makeAutoPodRow({ pod_amount: 200, no_of_spots: 5 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.inRange).toBe(true);
    expect(result.current.viable).toBe(false);
  });

  it('lifts spots below the venue minimum up to it, once the server names the range', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection({ min_spots: 4 }) });
    const row = makeAutoPodRow({ pod_amount: 200, no_of_spots: 1 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.spots).toBe(4);
  });

  it('reports spots above the venue ceiling as out of range and not viable', async () => {
    request.mockResolvedValue({ autoPodHostProjection: projection({ max_spots: 4 }) });
    const row = makeAutoPodRow({ pod_amount: 200, no_of_spots: 6 });
    const { result } = renderHook(() => useAutoPodPricing(row));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.inRange).toBe(false);
    expect(result.current.viable).toBe(false);
  });

  it('re-seeds when a different offer is opened, and follows typed changes', () => {
    const first = makeAutoPodRow({ id: 'a', pod_amount: 100, no_of_spots: 2 });
    const second = makeAutoPodRow({ id: 'b', pod_amount: 300, no_of_spots: 8 });
    request.mockResolvedValue({ autoPodHostProjection: projection() });
    const { result, rerender } = renderHook(
      ({ row }: { row: typeof first }) => useAutoPodPricing(row),
      { initialProps: { row: first } },
    );
    act(() => result.current.setPrice('150'));
    expect(result.current.amount).toBe(150);
    act(() => result.current.setSpots(3));
    expect(result.current.spots).toBe(3);
    rerender({ row: second });
    expect(result.current.price).toBe('300');
    expect(result.current.spots).toBe(8);
  });
});

describe('useAutoPodEarnings', () => {
  const row = makeAutoPodRow({ id: 'ap1' });

  it('starts closed with no figures', () => {
    const { result } = renderHook(() => useAutoPodEarnings());
    expect(result.current.row).toBeNull();
    expect(result.current.values).toEqual({});
  });

  it('opens a card calculator, records its figure and closes it', () => {
    const { result } = renderHook(() => useAutoPodEarnings());
    act(() => result.current.open(row));
    expect(result.current.row).toBe(row);
    act(() => result.current.record(450));
    expect(result.current.values).toEqual({ ap1: 450 });
    act(() => result.current.close());
    expect(result.current.row).toBeNull();
    expect(result.current.values).toEqual({ ap1: 450 });
  });

  it('clears the figure when the calculator reports none', () => {
    const { result } = renderHook(() => useAutoPodEarnings());
    act(() => result.current.open(row));
    act(() => result.current.record(450));
    act(() => result.current.record(null));
    expect(result.current.values).toEqual({});
  });

  it('records nothing when no calculator is open', () => {
    const { result } = renderHook(() => useAutoPodEarnings());
    act(() => result.current.record(450));
    expect(result.current.values).toEqual({});
  });
});

describe('useAutoPodVenues', () => {
  const venue = (over: Record<string, unknown> = {}) => ({
    id: 'v1',
    venue_name: 'Court Nine',
    status: 'APPROVED',
    is_active: true,
    location_id: 'blr',
    city: 'Bengaluru',
    capacity: 20,
    capacity_items: [{ label: 'Court A', capacity: 8 }],
    venue_category: null,
    venue_categories: [
      {
        sub_category_id: 'run',
        super_category_name: 'Active',
        category_name: 'Sports',
        sub_category_name: 'Running',
      },
    ],
    ...over,
  });

  it('keeps only approved, active venues, shaped for the queue', async () => {
    request.mockResolvedValue({
      myVenues: [
        venue(),
        venue({ id: 'v2', status: 'PENDING' }),
        venue({ id: 'v3', is_active: false }),
      ],
    });
    const { result } = renderHook(() => useAutoPodVenues());
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(request).toHaveBeenCalledWith(MyVenuesForAutoPodDocument, undefined, { auth: true });
    expect(result.current.venues).toEqual([
      {
        id: 'v1',
        venue_name: 'Court Nine',
        location_id: 'blr',
        city: 'Bengaluru',
        capacity: 20,
        capacity_items: [{ label: 'Court A', capacity: 8 }],
        venue_categories: [
          {
            sub_category_id: 'run',
            super_category_name: 'Active',
            category_name: 'Sports',
            sub_category_name: 'Running',
          },
        ],
      },
    ]);
  });

  it('fills in what a venue leaves unset', async () => {
    request.mockResolvedValue({
      myVenues: [
        venue({
          location_id: null,
          capacity: null,
          capacity_items: null,
          venue_categories: [],
          venue_category: {
            sub_category_id: null,
            super_category_name: 'Active',
            category_name: 'Sports',
            sub_category_name: 'Running',
          },
        }),
      ],
    });
    const { result } = renderHook(() => useAutoPodVenues());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const [only] = result.current.venues;
    expect(only?.location_id).toBeNull();
    expect(only?.capacity).toBe(0);
    expect(only?.capacity_items).toEqual([]);
    // The legacy single category stands in for an empty list.
    expect(only?.venue_categories).toEqual([
      {
        sub_category_id: null,
        super_category_name: 'Active',
        category_name: 'Sports',
        sub_category_name: 'Running',
      },
    ]);
  });

  it('settles with no venues when the read fails', async () => {
    request.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAutoPodVenues());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.venues).toEqual([]);
  });

  it('re-reads when a pull-to-refresh fires', async () => {
    request.mockResolvedValue({ myVenues: [venue()] });
    const { result } = renderHook(() => useAutoPodVenues());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const refetch = mockRefresh.mock.lastCall?.[0] as () => void;
    act(() => refetch());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('drops an answer that lands after the screen is gone', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result, unmount } = renderHook(() => useAutoPodVenues());
    unmount();
    await act(async () => finish({ myVenues: [venue()] }));
    expect(result.current.venues).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });
});

describe('useAutoPodCounts', () => {
  const counts = { myAutoPodActionCounts: { venue: 1, host: 2, club: 3 } };

  it('reads nothing for a feature that is off', () => {
    flag.mockReturnValue(false);
    const { result } = renderHook(() => useAutoPodCounts(['HOST']));
    result.current.reload();
    expect(request).not.toHaveBeenCalled();
    expect(result.current.counts).toBeUndefined();
  });

  it('reads nothing for a consumer who holds no partner role', () => {
    flag.mockReturnValue(true);
    const { result } = renderHook(() => useAutoPodCounts(['USER']));
    result.current.reload();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['HOST', 'VENUE_OWNER', 'CLUB_ADMIN'])('reads the counts for a %s', async (role) => {
    flag.mockReturnValue(true);
    request.mockResolvedValue(counts);
    const { result } = renderHook(() => useAutoPodCounts(['USER', role]));
    await waitFor(() => expect(result.current.counts).toEqual({ venue: 1, host: 2, club: 3 }));
  });

  it('reads once per session but re-reads when the switch dialog opens', async () => {
    flag.mockReturnValue(true);
    request.mockResolvedValue(counts);
    const { result, rerender } = renderHook(() => useAutoPodCounts(['HOST']));
    await waitFor(() => expect(result.current.counts).toBeDefined());
    rerender({});
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValue({ myAutoPodActionCounts: { venue: 0, host: 5, club: 0 } });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.counts?.host).toBe(5));
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('useAutoPodScreen', () => {
  it('assembles the queue, the labels and the admin-configured formatters', () => {
    const rows = [makeAutoPodRow()];
    queue.mockReturnValue({ rows, isLoading: false, error: false, refetch: jest.fn() } as never);
    const { result } = renderHook(() => useAutoPodScreen('host', { locationId: 'blr' }));
    expect(queue).toHaveBeenCalledWith('host', { locationId: 'blr' });
    expect(result.current.rows).toBe(rows);
    expect(result.current.labels.loadFailed).toBe('mweb.autoPods.loadFailed');
    expect(result.current.formatWhen('2030-01-01T00:00:00Z')).toBe('at 2030-01-01T00:00:00Z');
    expect(result.current.formatMoney(1500)).toContain('$');
    expect(result.current.formatMoney(1500)).toContain('1');
  });

  it('defaults to an unfiltered queue', () => {
    queue.mockReturnValue({ rows: [] } as never);
    renderHook(() => useAutoPodScreen('venue'));
    expect(queue).toHaveBeenCalledWith('venue', {});
  });
});

describe('auto pod counts store', () => {
  it('keeps what it has instead of failing the switch when the read throws', async () => {
    request.mockRejectedValue(new Error('offline'));
    await useAutoPodCountsStore.getState().fetch();
    expect(useAutoPodCountsStore.getState().data).toBeUndefined();
    expect(useAutoPodCountsStore.getState().isLoading).toBe(false);
  });

  it('serves the cached counts without a read unless forced', async () => {
    useAutoPodCountsStore.setState({ data: { venue: 4, host: 0, club: 0 } });
    await useAutoPodCountsStore.getState().fetch();
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue({ myAutoPodActionCounts: { venue: 9, host: 0, club: 0 } });
    await useAutoPodCountsStore.getState().fetch(true);
    expect(useAutoPodCountsStore.getState().data?.venue).toBe(9);
  });

  it('does not start a second read while one is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const first = useAutoPodCountsStore.getState().fetch();
    await useAutoPodCountsStore.getState().fetch(true);
    expect(request).toHaveBeenCalledTimes(1);
    finish({ myAutoPodActionCounts: { venue: 1, host: 0, club: 0 } });
    await first;
    expect(useAutoPodCountsStore.getState().data).toEqual({ venue: 1, host: 0, club: 0 });
  });
});
