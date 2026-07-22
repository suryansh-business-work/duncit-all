import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { usePodIdeaDetails, usePodIdeas } from '@/hooks/usePodIdeas';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const idea = (id: string, status = 'APPROVED') => ({
  id,
  author_id: 'u1',
  title: `Idea ${id}`,
  description: 'desc',
  likes_count: 0,
  liked_by_me: false,
  shares_count: 0,
  comments_count: 0,
  status,
  created_at: new Date().toISOString(),
  author: { user_id: 'u1', full_name: 'Aa', first_name: 'Aa' },
});

const listData = {
  podIdeas: [idea('1')],
  myPodIdeas: [idea('2', 'PENDING'), idea('3', 'APPROVED')],
  me: { user_id: 'me' },
};

beforeEach(() => mockRequest.mockReset());

describe('usePodIdeas', () => {
  it('loads the feed and derives ideas, my non-approved submissions and id', async () => {
    mockRequest.mockResolvedValue(listData);
    const { result } = renderHook(() => usePodIdeas(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ideas).toHaveLength(1);
    expect(result.current.myIdeas.map((i) => i.id)).toEqual(['2']);
    expect(result.current.myId).toBe('me');
    expect(mockRequest.mock.calls[0][1]).toEqual({ filter: { status: 'APPROVED' } });
  });

  it('passes the trimmed search into the filter', async () => {
    mockRequest.mockResolvedValue(listData);
    const { result } = renderHook(() => usePodIdeas('  jam  '));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest.mock.calls[0][1]).toEqual({ filter: { status: 'APPROVED', search: 'jam' } });
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodIdeas(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('creates, likes, shares and deletes — each reloads the feed', async () => {
    mockRequest.mockResolvedValue(listData);
    const { result } = renderHook(() => usePodIdeas(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() =>
      result.current.create({
        title: 'Title',
        description: 'Body',
        super_category_id: 's1',
        category_id: 'c1',
        sub_category_id: 'b1',
        super_category_name: 'For You',
        category_name: 'Sports',
        sub_category_name: 'Badminton',
      }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          title: 'Title',
          description: 'Body',
          super_category_id: 's1',
          category_id: 'c1',
          sub_category_id: 'b1',
          super_category_name: 'For You',
          category_name: 'Sports',
          sub_category_name: 'Badminton',
        },
      },
      { auth: true },
    );

    await act(() => result.current.toggleLike('1'));
    await act(() => result.current.share('1'));
    await act(() => result.current.deleteIdea('1'));
    // mount load + (create + reload) + (like + reload) + (share + reload) + (delete + reload)
    expect(mockRequest.mock.calls.length).toBe(9);
  });
});

describe('usePodIdeaDetails', () => {
  const detailsData = {
    podIdea: {
      ...idea('1'),
      comments: [
        {
          id: 'c1',
          author_id: 'me',
          text: 'hi',
          created_at: new Date().toISOString(),
          author: { user_id: 'me', full_name: 'Me', first_name: 'Me' },
        },
      ],
    },
  };

  it('loads the idea then runs comment/like actions that reload and notify', async () => {
    mockRequest.mockResolvedValue(detailsData);
    const onChanged = jest.fn();
    const { result } = renderHook(() => usePodIdeaDetails('1', onChanged));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.idea?.id).toBe('1');

    await act(() => result.current.addComment(' nice '));
    expect(onChanged).toHaveBeenCalledTimes(1);
    await act(() => result.current.deleteComment('c1'));
    await act(() => result.current.toggleLike());
    expect(onChanged).toHaveBeenCalledTimes(3);
  });

  it('leaves idea null when the load fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodIdeaDetails('1', jest.fn()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.idea).toBeNull();
  });

  it('handles a missing idea', async () => {
    mockRequest.mockResolvedValueOnce({ podIdea: null });
    const { result } = renderHook(() => usePodIdeaDetails('x', jest.fn()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.idea).toBeNull();
  });
});
