import { renderHook } from '@testing-library/react-native';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useHomeData, useHomeFeed } from '@/hooks/useHomeFeed';

const mockHomeState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: undefined,
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/home.store', () => ({
  useHomeStore: (selector: (s: unknown) => unknown) => selector(mockHomeState),
}));
jest.mock('@/hooks/useSuperCategories', () => ({
  useSuperCategories: jest.fn(() => ({ selectedSuperId: null })),
}));
jest.mock('@/hooks/useLocations', () => ({ useLocations: jest.fn(() => ({ selectedId: '' })) }));
const mockedSuper = useSuperCategories as jest.Mock;
const mockedLoc = useLocations as jest.Mock;

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const pod = (id: string, clubId: string, date: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    pod_title: `Pod ${id}`,
    pod_date_time: date,
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    no_of_spots: 4,
    host_names: [],
    pod_images_and_videos: [],
    club_id: clubId,
    club_slug: 's',
    place_label: null,
    place_detail: null,
  }) as never;

beforeEach(() => {
  mockedSuper.mockReturnValue({ selectedSuperId: null });
  mockedLoc.mockReturnValue({ selectedId: '' });
  mockHomeState.data = {
    clubs: [
      {
        id: 'c1',
        club_id: 'cl1',
        club_name: 'C1',
        club_description: '',
        club_feature_images_and_videos: [],
        category_id: 'cat1',
        super_category_id: null,
      },
    ],
    pods: [pod('1', 'c1', future(2)), pod('2', 'c1', future(1))],
    categories: [{ id: 'cat1', name: 'Cat', slug: 'cat', level: 'CATEGORY', parent_id: null }],
  };
});

describe('useHomeFeed', () => {
  it('derives clubs-with-pods, featured pods (soonest first) and chips', () => {
    const { result } = renderHook(() => useHomeFeed(''));
    expect(result.current.clubsWithPods).toHaveLength(1);
    expect(result.current.featuredPods[0]?.id).toBe('2'); // earlier date first
    expect(result.current.categoryChips).toHaveLength(1);
    expect(result.current.totalPods).toBe(2);
  });

  it('filters by the selected vibe category', () => {
    expect(renderHook(() => useHomeFeed('cat1')).result.current.totalPods).toBe(2);
    expect(renderHook(() => useHomeFeed('other')).result.current.clubsWithPods).toHaveLength(0);
  });

  it('hides vibe chips for categories that have no pods (bug 6)', () => {
    mockHomeState.data = {
      ...(mockHomeState.data as Record<string, unknown>),
      categories: [
        { id: 'cat1', name: 'Has pods', slug: 'c1', level: 'CATEGORY', parent_id: null },
        { id: 'cat2', name: 'No pods', slug: 'c2', level: 'CATEGORY', parent_id: null },
      ],
    };
    const { result } = renderHook(() => useHomeFeed(''));
    expect(result.current.categoryChips.map((c) => c.id)).toEqual(['cat1']);
  });

  it('filters out pods when a super-category or location is selected', () => {
    mockedSuper.mockReturnValue({ selectedSuperId: 'super-x' });
    expect(renderHook(() => useHomeFeed('')).result.current.totalPods).toBe(0);

    mockedSuper.mockReturnValue({ selectedSuperId: null });
    mockedLoc.mockReturnValue({ selectedId: 'loc-y' });
    expect(renderHook(() => useHomeFeed('')).result.current.totalPods).toBe(0);
    expect(renderHook(() => useHomeData()).result.current.pods).toHaveLength(0);
  });

  it('keeps virtual pods on the home feed despite a location filter', () => {
    mockHomeState.data = {
      clubs: [{ id: 'c1', category_id: 'cat1', super_category_id: null }],
      pods: [
        {
          id: '1',
          club_id: 'c1',
          pod_date_time: future(1),
          location_id: 'other',
          pod_mode: 'PHYSICAL',
        },
        {
          id: '2',
          club_id: 'c1',
          pod_date_time: future(1),
          location_id: null,
          pod_mode: 'VIRTUAL',
        },
      ],
      categories: [],
    } as never;
    mockedLoc.mockReturnValue({ selectedId: 'loc-y' });
    const { result } = renderHook(() => useHomeFeed(''));
    expect(result.current.featuredPods.map((p) => p.id)).toEqual(['2']);
  });

  it('moves past-date pods out of the active feed into previousPods (bug 8)', () => {
    mockHomeState.data = {
      clubs: [{ id: 'c1', category_id: 'cat1', super_category_id: null }],
      pods: [pod('up', 'c1', future(1)), pod('old', 'c1', past(2)), pod('older', 'c1', past(5))],
      categories: [],
    } as never;
    const { result } = renderHook(() => useHomeFeed(''));
    expect(result.current.featuredPods.map((p) => p.id)).toEqual(['up']);
    expect(result.current.totalPods).toBe(1);
    // Newest-first ordering of the previous pods.
    expect(result.current.previousPods.map((p) => p.id)).toEqual(['old', 'older']);
  });
});

describe('useHomeFeed filters (bug 6)', () => {
  beforeEach(() => {
    mockHomeState.data = {
      clubs: [{ id: 'c1', category_id: 'cat1', super_category_id: null }],
      pods: [
        {
          id: 'free',
          club_id: 'c1',
          pod_type: 'NATIVE_FREE',
          pod_amount: 0,
          pod_date_time: future(2),
          location_id: null,
        },
        {
          id: 'paid',
          club_id: 'c1',
          pod_type: 'NATIVE_PAID',
          pod_amount: 500,
          pod_date_time: future(1),
          location_id: null,
        },
      ],
      categories: [],
    } as never;
  });

  it('keeps only pods matching the selected price', () => {
    const { result } = renderHook(() =>
      useHomeFeed('', { price: 'FREE', date: 'ALL', sort: 'DATE_ASC' }),
    );
    expect(result.current.featuredPods.map((p) => p.id)).toEqual(['free']);
  });

  it('orders each club row by the selected sort', () => {
    const { result } = renderHook(() =>
      useHomeFeed('', { price: 'ALL', date: 'ALL', sort: 'PRICE_DESC' }),
    );
    expect(result.current.clubsWithPods[0]?.pods.map((p) => p.id)).toEqual(['paid', 'free']);
  });

  it('drops everything when the date window excludes all pods', () => {
    const { result } = renderHook(() =>
      useHomeFeed('', { price: 'ALL', date: 'TODAY', sort: 'DATE_ASC' }),
    );
    expect(result.current.totalPods).toBe(0);
  });
});

describe('useHomeData', () => {
  it('exposes the raw lists', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.clubs).toHaveLength(1);
    expect(result.current.pods).toHaveLength(2);
    expect(result.current.hasData).toBe(true);
  });

  it('handles an undefined feed (empty derivations)', () => {
    mockHomeState.data = undefined;
    expect(renderHook(() => useHomeFeed('')).result.current.clubsWithPods).toHaveLength(0);
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasData).toBe(false);
    expect(result.current.clubs).toHaveLength(0);
  });

  it('narrows clubs + pods to the super-category and location but keeps virtual pods', () => {
    mockHomeState.data = {
      clubs: [
        { id: 'c1', super_category_id: 's1' },
        { id: 'c2', super_category_id: 's2' },
      ],
      pods: [
        { id: '1', club_id: 'c1', location_id: 'l1', pod_mode: 'PHYSICAL' },
        { id: '2', club_id: 'c2', location_id: 'l1', pod_mode: 'PHYSICAL' },
        { id: '3', club_id: 'c1', location_id: 'l2', pod_mode: 'PHYSICAL' },
        { id: '4', club_id: 'c1', location_id: null, pod_mode: 'VIRTUAL' },
      ],
      categories: [],
    } as never;
    mockedSuper.mockReturnValue({ selectedSuperId: 's1' });
    mockedLoc.mockReturnValue({ selectedId: 'l1' });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.clubs.map((c) => c.id)).toEqual(['c1']);
    // p1 matches the city, p3 is a different city (dropped), p4 is virtual (kept).
    expect(result.current.pods.map((p) => p.id)).toEqual(['1', '4']);
  });

  it('forwards forced refetches from both home hooks', () => {
    renderHook(() => useHomeData()).result.current.refetch();
    renderHook(() => useHomeFeed('')).result.current.refetch();
    expect(mockHomeState.fetch).toHaveBeenCalledWith(true);
  });

  it('coalesces an absent pod list to empty under a super-category filter', () => {
    mockHomeState.data = {
      clubs: [{ id: 'c1', super_category_id: 's1' }],
      categories: [],
    } as never;
    mockedSuper.mockReturnValue({ selectedSuperId: 's1' });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.pods).toEqual([]);
  });
});

describe('deriveHome edge cases', () => {
  it('skips clubs with no pods and treats missing pod dates as epoch zero', () => {
    mockHomeState.data = {
      clubs: [
        { id: 'c1', category_id: 'cat1', super_category_id: null },
        { id: 'c2', category_id: 'cat1', super_category_id: null },
      ],
      pods: [
        { id: '1', club_id: 'c1', pod_date_time: null, location_id: null },
        { id: '2', club_id: 'c1', pod_date_time: '', location_id: null },
      ],
      categories: [],
    } as never;
    const { result } = renderHook(() => useHomeFeed(''));
    expect(result.current.clubsWithPods).toHaveLength(1); // c2 has no pods → dropped
    expect(result.current.featuredPods).toHaveLength(2); // both dateless → epoch 0
  });
});
