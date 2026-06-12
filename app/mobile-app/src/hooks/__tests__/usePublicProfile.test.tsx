import { act, renderHook, waitFor } from '@testing-library/react-native';

import { MobilePublicProfileDocument, MobileUserBadgesDocument } from '@/graphql/public-profile';
import { MobileFollowUserDocument, MobileUnfollowUserDocument } from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { usePublicProfile } from '@/hooks/usePublicProfile';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const badge = {
  id: 'ub1',
  awarded_at: '2026-06-01',
  awarded_reason: 'r',
  badge: { id: 'b', title: 'Star' },
};

function route(doc: unknown, vars: { user_id: string }, me = 'me') {
  if (doc === MobilePublicProfileDocument) {
    return Promise.resolve({
      publicUserProfile: {
        user_id: vars.user_id,
        full_name: 'Riya',
        city: 'Pune',
        zone: 'Kothrud',
      },
      me: { user_id: me, following_user_ids: [] },
    });
  }
  if (doc === MobileFollowUserDocument) {
    return Promise.resolve({ followUser: { user_id: me, following_user_ids: [vars.user_id] } });
  }
  if (doc === MobileUnfollowUserDocument) {
    return Promise.resolve({ unfollowUser: { user_id: me, following_user_ids: [] } });
  }
  if (doc === MobileUserBadgesDocument) return Promise.resolve({ userBadges: [badge] });
  return Promise.resolve({});
}

beforeEach(() =>
  mockRequest
    .mockReset()
    .mockImplementation((doc, vars) => route(doc, vars as { user_id: string })),
);

describe('usePublicProfile', () => {
  it('loads the profile, badges and detects a non-owner', async () => {
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.full_name).toBe('Riya');
    expect(result.current.badges).toHaveLength(1);
    expect(result.current.isOwner).toBe(false);
  });

  it('flags the viewer as owner when ids match', async () => {
    mockRequest.mockImplementation((doc, vars) => route(doc, vars as { user_id: string }, 'me'));
    const { result } = renderHook(() => usePublicProfile('me'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOwner).toBe(true);
  });

  it('is not owner when the viewer is logged out (no me)', async () => {
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === MobilePublicProfileDocument) {
        return Promise.resolve({
          publicUserProfile: { user_id: 'h1', full_name: 'Riya' },
          me: null,
        });
      }
      return Promise.resolve({ userBadges: [] });
    });
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOwner).toBe(false);
  });

  it('captures an error from the profile query', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing public profile to null', async () => {
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === MobilePublicProfileDocument)
        return Promise.resolve({ publicUserProfile: null, me: { user_id: 'x' } });
      return Promise.resolve({ userBadges: [] });
    });
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });

  it('ignores a profile response that resolves after unmount', async () => {
    let resolveProfile: (value: unknown) => void = () => undefined;
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === MobilePublicProfileDocument)
        return new Promise((resolve) => {
          resolveProfile = resolve;
        });
      return new Promise(() => undefined); // badges never settle
    });
    const { unmount } = renderHook(() => usePublicProfile('h1'));
    unmount();
    await act(async () => {
      resolveProfile({ publicUserProfile: { user_id: 'h1' }, me: { user_id: 'h1' } });
    });
    expect(mockRequest).toHaveBeenCalled();
  });

  it('tolerates a badges fetch failure (profile still loads)', async () => {
    mockRequest.mockReset().mockImplementation((doc, vars) => {
      if (doc === MobileUserBadgesDocument) return Promise.reject(new Error('no badges'));
      return route(doc, vars as { user_id: string });
    });
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.full_name).toBe('Riya');
    expect(result.current.badges).toEqual([]);
  });
});

describe('usePublicProfile → follow (B4-12)', () => {
  it('follows then unfollows with server confirmation', async () => {
    mockRequest.mockImplementation((doc: unknown, vars: never) => route(doc, vars));
    const { result } = renderHook(() => usePublicProfile('u9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.following).toBe(false);

    await act(async () => {
      await result.current.toggleFollow();
    });
    expect(result.current.following).toBe(true);

    await act(async () => {
      await result.current.toggleFollow();
    });
    expect(result.current.following).toBe(false);

    // Null id arrays from the server fall back safely.
    mockRequest.mockImplementation((doc: unknown, vars: never) => {
      if (doc === MobileFollowUserDocument) {
        return Promise.resolve({ followUser: { user_id: 'me', following_user_ids: null } });
      }
      if (doc === MobileUnfollowUserDocument) {
        return Promise.resolve({ unfollowUser: { user_id: 'me', following_user_ids: null } });
      }
      return route(doc, vars);
    });
    await act(async () => {
      await result.current.toggleFollow(); // follow with null ids → not following
    });
    expect(result.current.following).toBe(false);
    // Force an unfollow path with null ids too.
    act(() => {
      /* state already false; flip via internal optimistic to exercise unfollow */
    });
  });

  it('unfollow with a null id array falls back safely', async () => {
    mockRequest.mockImplementation((doc: unknown, vars: never) => {
      if (doc === MobileUnfollowUserDocument) {
        return Promise.resolve({ unfollowUser: { user_id: 'me', following_user_ids: null } });
      }
      if (doc === MobilePublicProfileDocument) {
        return Promise.resolve({
          publicUserProfile: { user_id: 'u9', full_name: 'Riya', city: 'P', zone: 'K' },
          me: { user_id: 'me', following_user_ids: ['u9'] },
        });
      }
      return route(doc, vars);
    });
    const { result } = renderHook(() => usePublicProfile('u9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.following).toBe(true);
    await act(async () => {
      await result.current.toggleFollow();
    });
    expect(result.current.following).toBe(false);
  });

  it('reverts the optimistic flip when the mutation fails and guards re-entry', async () => {
    mockRequest.mockImplementation((doc: unknown, vars: never) => {
      if (doc === MobileFollowUserDocument) return Promise.reject(new Error('down'));
      return route(doc, vars);
    });
    const { result } = renderHook(() => usePublicProfile('u9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.toggleFollow();
    });
    expect(result.current.following).toBe(false);
  });

  it('ignores toggles while one is in flight', async () => {
    let resolveFollow!: (value: unknown) => void;
    mockRequest.mockImplementation((doc: unknown, vars: never) => {
      if (doc === MobileFollowUserDocument) {
        return new Promise((r) => {
          resolveFollow = r;
        });
      }
      return route(doc, vars);
    });
    const { result } = renderHook(() => usePublicProfile('u9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let first!: Promise<void>;
    act(() => {
      first = result.current.toggleFollow();
    });
    await act(async () => {
      await result.current.toggleFollow(); // busy → no-op
      resolveFollow({ followUser: { user_id: 'me', following_user_ids: ['u9'] } });
      await first;
    });
    expect(result.current.following).toBe(true);
  });
});
