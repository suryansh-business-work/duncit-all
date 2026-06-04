import { renderHook } from '@testing-library/react-native';

import { useFollowing } from '@/hooks/useFollowing';

const mockFollowingState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: { me: { user_id: 'u', following_pod_ids: ['p1'], following_user_ids: [] } },
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/following.store', () => ({
  useFollowingStore: (selector: (s: unknown) => unknown) => selector(mockFollowingState),
}));
jest.mock('@/hooks/useHomeFeed', () => ({
  useHomeData: () => ({
    pods: [{ id: 'p1' }, { id: 'p2' }],
    isLoading: false,
    hasData: true,
    refetch: jest.fn(),
  }),
}));

describe('useFollowing', () => {
  it('keeps only followed pods from the feed', () => {
    const { result } = renderHook(() => useFollowing());
    expect(result.current.followedPods.map((p: { id: string }) => p.id)).toEqual(['p1']);
    expect(result.current.hasData).toBe(true);
    result.current.refetch();
    expect(mockFollowingState.fetch).toHaveBeenCalled();
  });
});
