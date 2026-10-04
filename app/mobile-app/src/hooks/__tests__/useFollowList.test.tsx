import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileCancelFollowRequestDocument,
  MobileFollowUserDocument,
  MobileUnfollowUserDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useFollowList } from '@/hooks/useFollowList';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const person = (id: string, following = false) => ({
  user_id: id,
  username: `${id}1`,
  full_name: `User ${id}`,
  first_name: 'User',
  profile_photo: null,
  is_following: following,
});

// Every follow mutation answers with the viewer's own lists; the row settles on
// what those lists say, not on the tap.
const lists = (following: string[] = [], requested: string[] = []) => ({
  following_user_ids: following,
  requested_user_ids: requested,
});

beforeEach(() => mockRequest.mockReset());

describe('useFollowList (bug 9)', () => {
  it('loads the followers list', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a')] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.people.map((p) => p.user_id)).toEqual(['a']);
  });

  it('loads the following list', async () => {
    mockRequest.mockResolvedValueOnce({ followingOf: [person('b'), person('c')] });
    const { result } = renderHook(() => useFollowList('target', 'following'));
    await waitFor(() => expect(result.current.people).toHaveLength(2));
  });

  it('falls back to an empty list on error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.people).toEqual([]);
  });

  it('follows then unfollows a row with the server-settled status, leaving other rows untouched', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a', false), person('b', false)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(2));

    mockRequest.mockResolvedValueOnce({ followUser: lists(['a']) });
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileFollowUserDocument,
      { user_id: 'a' },
      { auth: true },
    );
    expect(result.current.people[0]?.is_following).toBe(true);
    expect(result.current.people[0]?.follow_status).toBe('FOLLOWING');
    // The other row (b) is left as-is — covers the untouched branch.
    expect(result.current.people[1]?.is_following).toBe(false);
    expect(result.current.people[1]?.follow_status).toBeUndefined();

    mockRequest.mockResolvedValueOnce({ unfollowUser: lists() });
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileUnfollowUserDocument,
      { user_id: 'a' },
      { auth: true },
    );
    expect(result.current.people[0]?.is_following).toBe(false);
    expect(result.current.people[0]?.follow_status).toBe('NONE');
    expect(result.current.busyId).toBeNull();
  });

  it('unfollows a person who is already followed', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a', true)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(1));
    mockRequest.mockResolvedValueOnce({ unfollowUser: lists() });
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileUnfollowUserDocument,
      { user_id: 'a' },
      { auth: true },
    );
    expect(result.current.people[0]?.is_following).toBe(false);
  });

  it('lands a private person on Requested, and tapping again withdraws the ask', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('p', false)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(1));

    mockRequest.mockResolvedValueOnce({ followUser: lists([], ['p']) });
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(result.current.people[0]?.follow_status).toBe('REQUESTED');
    expect(result.current.people[0]?.is_following).toBe(false);

    mockRequest.mockResolvedValueOnce({ cancelFollowRequest: lists() });
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileCancelFollowRequestDocument,
      { user_id: 'p' },
      { auth: true },
    );
    expect(result.current.people[0]?.follow_status).toBe('NONE');
  });

  it('clears the busy row and keeps the row unchanged when the mutation fails', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a', false)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(1));

    mockRequest.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(result.current.toggle(result.current.people[0]!)).rejects.toThrow('offline');
    });
    expect(result.current.busyId).toBeNull();
    expect(result.current.people[0]?.is_following).toBe(false);
  });
});
