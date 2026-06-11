import { renderHook } from '@testing-library/react-native';

import { usePodSearch } from '@/hooks/usePodSearch';

const mockHomeState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: undefined,
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/home.store', () => ({
  useHomeStore: (selector: (s: unknown) => unknown) => selector(mockHomeState),
}));

const pod = (id: string, title: string, place: string | null) =>
  ({
    id,
    pod_id: `p-${id}`,
    pod_title: title,
    pod_date_time: new Date().toISOString(),
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    no_of_spots: 4,
    host_names: [],
    pod_images_and_videos: [],
    club_id: 'c1',
    club_slug: 's',
    place_label: place,
    place_detail: null,
  }) as never;

beforeEach(() => {
  mockHomeState.fetch.mockClear();
  mockHomeState.data = {
    clubs: [],
    categories: [],
    pods: [
      pod('1', 'Sunset Yoga', 'Bandra'),
      pod('2', 'Chess Club', 'Andheri'),
      pod('3', 'Morning Run', null),
    ],
  };
});

describe('usePodSearch', () => {
  it('loads the feed on mount and returns nothing for an empty query', () => {
    const { result } = renderHook(() => usePodSearch('   '));
    expect(mockHomeState.fetch).toHaveBeenCalled();
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('matches pods by title', () => {
    const { result } = renderHook(() => usePodSearch('yoga'));
    expect(result.current.hasQuery).toBe(true);
    expect(result.current.results.map((p) => p.id)).toEqual(['1']);
  });

  it('matches pods by place text', () => {
    const { result } = renderHook(() => usePodSearch('andheri'));
    expect(result.current.results.map((p) => p.id)).toEqual(['2']);
  });

  it('returns an empty list when nothing matches', () => {
    const { result } = renderHook(() => usePodSearch('nothing here'));
    expect(result.current.results).toEqual([]);
  });

  it('tolerates an undefined feed', () => {
    mockHomeState.data = undefined;
    const { result } = renderHook(() => usePodSearch('yoga'));
    expect(result.current.results).toEqual([]);
  });
});
