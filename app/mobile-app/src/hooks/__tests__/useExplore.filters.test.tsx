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
      me: { user_id: 'me', saved_pod_ids: [] },
      clubs: [
        { id: 'c1', super_category_id: 's1' },
        { id: 'c2', super_category_id: 's2' },
      ],
      pods: [
        {
          id: 'p1',
          club_id: 'c1',
          location_id: 'l1',
          pod_mode: 'PHYSICAL',
          liked_by_me: false,
          like_count: 0,
          comment_count: 2,
        },
        {
          id: 'p2',
          club_id: 'c2',
          location_id: 'l2',
          pod_mode: 'PHYSICAL',
          liked_by_me: false,
          like_count: 0,
          comment_count: 0,
        },
        {
          id: 'p3',
          club_id: 'c1',
          location_id: null,
          pod_mode: 'VIRTUAL',
          liked_by_me: false,
          like_count: 0,
          comment_count: 0,
        },
      ],
    },
    isLoading: false,
    savedOverride: {},
    savePending: {},
    likeOverride: {},
    commentDelta: { p1: 3 },
    fetch,
    toggleSave: jest.fn(),
    toggleLike: jest.fn(),
    bumpComment: jest.fn(),
  });
  mockedSuper.mockReturnValue({ selectedSuperId: null });
  mockedLoc.mockReturnValue({ selectedId: '' });
});

describe('useExplore filtering', () => {
  it('drops pods whose club is outside the selected super-category', () => {
    mockedSuper.mockReturnValue({ selectedSuperId: 's1' });
    const { result } = renderHook(() => useExplore());
    // p1 and p3 both belong to club c1 (super s1); p2 (c2/s2) is dropped.
    expect(result.current.pods.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('drops located pods outside the selected city but keeps virtual pods', () => {
    mockedLoc.mockReturnValue({ selectedId: 'l1' });
    const { result } = renderHook(() => useExplore());
    // p1 matches the city, p2 is a different city (dropped), p3 is virtual (kept).
    expect(result.current.pods.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('exposes the viewer id and a comment count merged with the delta', () => {
    const { result } = renderHook(() => useExplore());
    expect(result.current.viewerId).toBe('me');
    const p1 = result.current.pods.find((p) => p.id === 'p1')!;
    expect(result.current.commentCountFor(p1)).toBe(5); // 2 base + 3 delta
    const p3 = result.current.pods.find((p) => p.id === 'p3')!;
    expect(result.current.commentCountFor(p3)).toBe(0); // no delta
  });

  it('forwards a forced refetch', () => {
    const { result } = renderHook(() => useExplore());
    result.current.refetch();
    expect(fetch).toHaveBeenCalledWith(true);
  });
});
