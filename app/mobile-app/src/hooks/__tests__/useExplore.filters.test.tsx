import { renderHook } from '@testing-library/react-native';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useExplore } from '@/hooks/useExplore';

const mockState: Record<string, unknown> = {};
jest.mock('@/stores/explore.store', () => ({
  useExploreStore: (selector: (s: unknown) => unknown) => selector(mockState),
}));
jest.mock('@/hooks/useSuperCategories', () => ({ useSuperCategories: jest.fn() }));
jest.mock('@/hooks/useLocations', () => ({ useLocations: jest.fn() }));

const mockedSuper = useSuperCategories as jest.Mock;
const mockedLoc = useLocations as jest.Mock;
const fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
  Object.assign(mockState, {
    data: {
      me: { saved_pod_ids: [] },
      clubs: [
        { id: 'c1', super_category_id: 's1' },
        { id: 'c2', super_category_id: 's2' },
      ],
      pods: [
        { id: 'p1', club_id: 'c1', location_id: 'l1', liked_by_me: false, like_count: 0 },
        { id: 'p2', club_id: 'c2', location_id: 'l2', liked_by_me: false, like_count: 0 },
      ],
    },
    isLoading: false,
    savedOverride: {},
    savePending: {},
    likeOverride: {},
    fetch,
    toggleSave: jest.fn(),
    toggleLike: jest.fn(),
  });
  mockedSuper.mockReturnValue({ selectedSuperId: null });
  mockedLoc.mockReturnValue({ selectedId: '' });
});

describe('useExplore filtering', () => {
  it('drops pods whose club is outside the selected super-category', () => {
    mockedSuper.mockReturnValue({ selectedSuperId: 's1' });
    const { result } = renderHook(() => useExplore());
    expect(result.current.pods.map((p) => p.id)).toEqual(['p1']);
  });

  it('drops pods that are not in the selected location', () => {
    mockedLoc.mockReturnValue({ selectedId: 'l1' });
    const { result } = renderHook(() => useExplore());
    expect(result.current.pods.map((p) => p.id)).toEqual(['p1']);
  });

  it('forwards a forced refetch', () => {
    const { result } = renderHook(() => useExplore());
    result.current.refetch();
    expect(fetch).toHaveBeenCalledWith(true);
  });
});
