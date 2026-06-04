import { renderHook } from '@testing-library/react-native';

import { useExplore } from '@/hooks/useExplore';

const mockState: Record<string, unknown> = {};
jest.mock('@/stores/explore.store', () => ({
  useExploreStore: (selector: (s: unknown) => unknown) => selector(mockState),
}));

const pod = {
  id: 'p1',
  club_id: 'c1',
  liked_by_me: false,
  like_count: 4,
} as never;

beforeEach(() => {
  Object.assign(mockState, {
    data: {
      me: { user_id: 'u', saved_pod_ids: ['p9'] },
      clubs: [{ id: 'c1', club_name: 'C1' }],
      pods: [pod],
    },
    isLoading: false,
    savedOverride: { p1: true },
    likeOverride: {},
    fetch: jest.fn(),
    toggleSave: jest.fn(),
    toggleLike: jest.fn(),
  });
});

describe('useExplore', () => {
  it('merges the saved override over the server saved set', () => {
    const { result } = renderHook(() => useExplore());
    expect(result.current.isSaved('p1')).toBe(true); // from override
    expect(result.current.isSaved('p9')).toBe(true); // from server
    expect(result.current.isSaved('p0')).toBe(false);
  });

  it('falls back to the pod like state when no override exists', () => {
    const { result } = renderHook(() => useExplore());
    expect(result.current.likeStateFor(pod)).toEqual({ liked_by_me: false, like_count: 4 });
    expect(result.current.clubsById.get('c1')?.club_name).toBe('C1');
  });

  it('handles an undefined feed', () => {
    Object.assign(mockState, { data: undefined, savedOverride: {}, likeOverride: {} });
    const { result } = renderHook(() => useExplore());
    expect(result.current.pods).toHaveLength(0);
    expect(result.current.isSaved('p1')).toBe(false);
    expect(result.current.likeStateFor(pod)).toEqual({ liked_by_me: false, like_count: 4 });
  });
});
