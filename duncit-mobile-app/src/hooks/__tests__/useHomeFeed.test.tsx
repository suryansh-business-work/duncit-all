import { renderHook } from '@testing-library/react-native';

import { useHomeData, useHomeFeed } from '@/hooks/useHomeFeed';

const mockHomeState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: undefined,
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/home.store', () => ({
  useHomeStore: (selector: (s: unknown) => unknown) => selector(mockHomeState),
}));

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
    pods: [pod('1', 'c1', '2026-06-10T00:00:00Z'), pod('2', 'c1', '2026-06-09T00:00:00Z')],
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
});
