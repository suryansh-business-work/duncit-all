import { graphqlRequest } from '@/services/graphql.client';
import { useChatStore } from '@/stores/chat.store';
import { useExploreStore } from '@/stores/explore.store';
import { useFollowingStore } from '@/stores/following.store';
import { useHomeStore } from '@/stores/home.store';
import { useStatusStore } from '@/stores/status.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

describe('home / following / chat stores', () => {
  it('home: fetches, skips when cached, captures errors', async () => {
    useHomeStore.setState({ data: undefined, isLoading: false, error: undefined });
    mockRequest.mockResolvedValueOnce({ clubs: [], pods: [], categories: [] });
    await useHomeStore.getState().fetch();
    expect(useHomeStore.getState().data).toEqual({ clubs: [], pods: [], categories: [] });

    await useHomeStore.getState().fetch(); // cached → no second call
    expect(mockRequest).toHaveBeenCalledTimes(1);

    useHomeStore.setState({ data: undefined });
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await useHomeStore.getState().fetch();
    expect(useHomeStore.getState().error).toBeDefined();
  });

  it('following + chat: fetch populate data', async () => {
    useFollowingStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockResolvedValueOnce({
      me: { user_id: 'u', following_pod_ids: ['p1'], following_user_ids: [] },
    });
    await useFollowingStore.getState().fetch();
    expect(useFollowingStore.getState().data?.me?.following_pod_ids).toEqual(['p1']);

    useChatStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockResolvedValueOnce({ myChatRooms: [{ id: 'r1' }] });
    await useChatStore.getState().fetch();
    expect(useChatStore.getState().data?.myChatRooms).toHaveLength(1);
  });
});

describe('store fetch guards', () => {
  it('skips while already loading and refetches with force', async () => {
    useExploreStore.setState({
      data: { me: null, clubs: [], pods: [] },
      isLoading: true,
      savedOverride: {},
      likeOverride: {},
    });
    await useExploreStore.getState().fetch(); // isLoading → early return
    expect(mockRequest).not.toHaveBeenCalled();

    useExploreStore.setState({ isLoading: false });
    mockRequest.mockResolvedValueOnce({ me: null, clubs: [], pods: [] });
    await useExploreStore.getState().fetch(true); // force refetch despite cached data
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('status fetch populates the feed', async () => {
    useStatusStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockResolvedValueOnce({ posts: [], myPosts: [] });
    await useStatusStore.getState().fetch();
    expect(useStatusStore.getState().data?.posts).toEqual([]);
  });

  it('chat / following / status skip when already cached', async () => {
    useChatStore.setState({ data: { myChatRooms: [] }, isLoading: false });
    await useChatStore.getState().fetch();
    useFollowingStore.setState({ data: { me: null }, isLoading: false });
    await useFollowingStore.getState().fetch();
    useStatusStore.setState({ data: { posts: [], myPosts: [] }, isLoading: false });
    await useStatusStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('explore store', () => {
  beforeEach(() =>
    useExploreStore.setState({
      data: undefined,
      isLoading: false,
      savedOverride: {},
      likeOverride: {},
    }),
  );

  it('toggleSave applies then reconciles with the server', async () => {
    mockRequest.mockResolvedValueOnce({
      toggleSavedPod: { pod_id: 'p1', saved: true, saved_pod_ids: ['p1'] },
    });
    await useExploreStore.getState().toggleSave('p1', false);
    expect(useExploreStore.getState().savedOverride.p1).toBe(true);
  });

  it('toggleSave reverts on error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('x'));
    await useExploreStore.getState().toggleSave('p2', false);
    expect('p2' in useExploreStore.getState().savedOverride).toBe(false);
  });

  it('toggleLike applies then reconciles, reverts on error', async () => {
    mockRequest.mockResolvedValueOnce({
      togglePodLike: { id: 'p1', liked_by_me: true, like_count: 5 },
    });
    await useExploreStore.getState().toggleLike('p1', { liked_by_me: false, like_count: 4 });
    expect(useExploreStore.getState().likeOverride.p1).toEqual({
      liked_by_me: true,
      like_count: 5,
    });

    mockRequest.mockRejectedValueOnce(new Error('x'));
    await useExploreStore.getState().toggleLike('p1', { liked_by_me: true, like_count: 5 });
    expect(useExploreStore.getState().likeOverride.p1).toEqual({
      liked_by_me: true,
      like_count: 5,
    });
  });
});

describe('status store', () => {
  beforeEach(() => useStatusStore.setState({ data: undefined, isLoading: false }));

  it('publish uploads, creates the post, then refetches', async () => {
    mockRequest
      .mockResolvedValueOnce({ uploadImageToImagekit: { url: 'https://img/x.jpg', fileId: 'f1' } })
      .mockResolvedValueOnce({
        createPost: { id: 'po1', image_url: 'https://img/x.jpg', caption: '', created_at: '' },
      })
      .mockResolvedValueOnce({ posts: [], myPosts: [] });
    await useStatusStore
      .getState()
      .publish({ base64: 'abc', fileName: 'x.jpg', mimeType: 'image/jpeg' });
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('publish throws without an image', async () => {
    await expect(useStatusStore.getState().publish({ base64: null })).rejects.toThrow(
      'No image selected.',
    );
  });
});
