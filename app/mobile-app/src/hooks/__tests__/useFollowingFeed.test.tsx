import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFollowingFeed, type FeedPost } from '@/hooks/useFollowingFeed';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

const post = (over: Record<string, unknown> = {}): FeedPost =>
  ({
    id: 'p1',
    author_id: 'u1',
    club_id: null,
    image_url: 'https://img/p.jpg',
    media_type: 'IMAGE',
    kind: 'POST',
    caption: 'Hi',
    likes_count: 2,
    liked_by_me: false,
    comments_count: 0,
    created_at: '2026-06-10T10:00:00Z',
    author: null,
    ...over,
  }) as never;

describe('useFollowingFeed', () => {
  it('fetches the feed for a source (enum mapped) and refetches', async () => {
    mockRequest.mockResolvedValue({ followingFeed: [post()] });
    const { result } = renderHook(() => useFollowingFeed('PEOPLE'));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockRequest.mock.calls[0][1]).toEqual({ source: 'PEOPLE' });
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('maps the CLUBS source and captures errors', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useFollowingFeed('CLUBS'));
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(mockRequest.mock.calls[0][1]).toEqual({ source: 'CLUBS' });
    expect(result.current.isLoading).toBe(false);
  });

  it('toggles a like optimistically and syncs the server result', async () => {
    mockRequest.mockResolvedValueOnce({ followingFeed: [post()] });
    const { result } = renderHook(() => useFollowingFeed('PEOPLE'));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    mockRequest.mockResolvedValueOnce({
      togglePostLike: { id: 'p1', liked_by_me: true, likes_count: 5 },
    });
    await act(async () => {
      await result.current.toggleLike(result.current.posts[0]!);
    });
    expect(result.current.posts[0]).toMatchObject({ liked_by_me: true, likes_count: 5 });
  });

  it('reverts the optimistic like on failure (both directions)', async () => {
    mockRequest.mockResolvedValueOnce({
      followingFeed: [post(), post({ id: 'p2', liked_by_me: true, likes_count: 7 })],
    });
    const { result } = renderHook(() => useFollowingFeed('PEOPLE'));
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    mockRequest.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await result.current.toggleLike(result.current.posts[0]!);
    });
    expect(result.current.posts[0]).toMatchObject({ liked_by_me: false, likes_count: 2 });
    mockRequest.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await result.current.toggleLike(result.current.posts[1]!);
    });
    expect(result.current.posts[1]).toMatchObject({ liked_by_me: true, likes_count: 7 });
  });
});
