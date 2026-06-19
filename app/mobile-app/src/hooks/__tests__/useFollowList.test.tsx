import { act, renderHook, waitFor } from '@testing-library/react-native';

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

  it('toggles follow state optimistically, leaving other rows untouched', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a', false), person('b', false)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(2));

    mockRequest.mockResolvedValueOnce({}); // follow mutation
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(result.current.people[0]?.is_following).toBe(true);
    // The other row (b) is left as-is — covers the untouched branch.
    expect(result.current.people[1]?.is_following).toBe(false);

    mockRequest.mockResolvedValueOnce({}); // unfollow mutation
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(result.current.people[0]?.is_following).toBe(false);
  });

  it('unfollows a person who is already followed', async () => {
    mockRequest.mockResolvedValueOnce({ followersOf: [person('a', true)] });
    const { result } = renderHook(() => useFollowList('target', 'followers'));
    await waitFor(() => expect(result.current.people).toHaveLength(1));
    mockRequest.mockResolvedValueOnce({});
    await act(async () => {
      await result.current.toggle(result.current.people[0]!);
    });
    expect(result.current.people[0]?.is_following).toBe(false);
  });
});
