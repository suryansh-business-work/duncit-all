import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFollowing } from '@/hooks/useFollowing';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const mockFollowingState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: undefined,
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/following.store', () => ({
  useFollowingStore: (selector: (s: unknown) => unknown) => selector(mockFollowingState),
}));

beforeEach(() => {
  mockRequest.mockReset();
  mockFollowingState.fetch.mockReset();
});

describe('useFollowing', () => {
  it('returns followed people and clubs', async () => {
    mockFollowingState.data = {
      me: {
        user_id: 'u',
        following_club_ids: ['c1'],
        following_user_ids: ['f1'],
      },
      clubs: [
        { id: 'c1', club_name: 'A' },
        { id: 'c2', club_name: 'B' },
      ],
    };
    mockRequest.mockResolvedValueOnce({ publicUsersByIds: [{ user_id: 'f1', full_name: 'Riya' }] });
    const { result } = renderHook(() => useFollowing());
    await waitFor(() => expect(result.current.people).toHaveLength(1));
    expect(result.current.followedClubs.map((c: { id: string }) => c.id)).toEqual(['c1']);
    expect(mockFollowingState.fetch).toHaveBeenCalled();
  });

  it('skips the people lookup when nobody is followed', () => {
    mockFollowingState.data = { me: { following_user_ids: [] }, clubs: [] };
    const { result } = renderHook(() => useFollowing());
    expect(result.current.people).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('falls back to an empty people list on lookup failure', async () => {
    mockFollowingState.data = { me: { following_user_ids: ['f1'] }, clubs: [] };
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useFollowing());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current.people).toEqual([]);
  });

  it('ignores a people response that lands after unmount', async () => {
    mockFollowingState.data = { me: { following_user_ids: ['f1'] }, clubs: [] };
    let resolvePeople!: (value: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolvePeople = r;
      }),
    );
    const { unmount } = renderHook(() => useFollowing());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolvePeople({ publicUsersByIds: [{ user_id: 'f1' }] });
    });
  });

  it('ignores a rejected people lookup after unmount', async () => {
    mockFollowingState.data = { me: { following_user_ids: ['f1'] }, clubs: [] };
    let rejectPeople!: (reason?: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectPeople = reject;
      }),
    );
    const { unmount } = renderHook(() => useFollowing());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectPeople(new Error('late'));
    });
  });

  it('treats absent data as empty and force-refetches', () => {
    mockFollowingState.data = undefined;
    const { result } = renderHook(() => useFollowing());
    expect(result.current.followedClubs).toEqual([]);
    expect(result.current.people).toEqual([]);
    result.current.refetch();
    expect(mockFollowingState.fetch).toHaveBeenCalledWith(true);
  });
});
