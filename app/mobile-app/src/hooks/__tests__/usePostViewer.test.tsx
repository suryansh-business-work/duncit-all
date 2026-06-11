import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { usePostViewer } from '@/hooks/usePostViewer';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const post = {
  id: 'p1',
  author_id: 'me',
  author: { user_id: 'me', full_name: 'Me', first_name: 'Me', profile_photo: null },
  image_url: 'https://i/a.jpg',
  caption: 'hello',
  likes_count: 1,
  liked_by_me: false,
  comments_count: 1,
  comments: [
    {
      id: 'c1',
      author_id: 'me',
      text: 'first',
      created_at: new Date().toISOString(),
      author: { user_id: 'me', full_name: 'Me', first_name: 'Me' },
    },
  ],
  created_at: new Date().toISOString(),
};

beforeEach(() => mockRequest.mockReset());

describe('usePostViewer', () => {
  it('loads the post, then like/comment actions reload it', async () => {
    mockRequest.mockResolvedValue({ post });
    const { result } = renderHook(() => usePostViewer('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.post?.id).toBe('p1');

    await act(() => result.current.toggleLike());
    await act(() => result.current.addComment(' nice '));
    await act(() => result.current.deleteComment('c1'));
    // mount load + 3 × (action + reload)
    expect(mockRequest).toHaveBeenCalledTimes(7);
  });

  it('deletes the post without reloading it', async () => {
    mockRequest.mockResolvedValue({ post });
    const { result } = renderHook(() => usePostViewer('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    await act(() => result.current.deletePost());
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('leaves post null when the load fails or the post is missing', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePostViewer('x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.post).toBeNull();

    mockRequest.mockResolvedValueOnce({ post: null });
    const { result: second } = renderHook(() => usePostViewer('y'));
    await waitFor(() => expect(second.current.isLoading).toBe(false));
    expect(second.current.post).toBeNull();
  });
});
