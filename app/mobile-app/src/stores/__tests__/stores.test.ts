import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useChatStore } from '@/stores/chat.store';
import { useExploreStore } from '@/stores/explore.store';
import { useFollowingStore } from '@/stores/following.store';
import { useHomeStore } from '@/stores/home.store';
import { useStatusStore } from '@/stores/status.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/imagekit-upload', () => ({ uploadToImagekitDirect: jest.fn() }));
jest.mock('@/services/video-compression', () => ({ compressUploadedVideo: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockDirect = uploadToImagekitDirect as jest.Mock;
const mockCompress = compressUploadedVideo as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  mockDirect.mockReset();
  mockCompress.mockReset();
});

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

  it('home: requestScrollTop bumps the scroll-to-top nonce (logo tap, bug 4)', () => {
    useHomeStore.setState({ scrollTopNonce: 0 });
    useHomeStore.getState().requestScrollTop();
    useHomeStore.getState().requestScrollTop();
    expect(useHomeStore.getState().scrollTopNonce).toBe(2);
  });

  it('following + chat: fetch populate data', async () => {
    useFollowingStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockResolvedValueOnce({
      me: { user_id: 'u', following_club_ids: ['c1'], following_user_ids: [] },
    });
    await useFollowingStore.getState().fetch();
    expect(useFollowingStore.getState().data?.me?.following_club_ids).toEqual(['c1']);

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
    mockRequest.mockResolvedValueOnce({ stories: [], myStories: [] });
    await useStatusStore.getState().fetch();
    expect(useStatusStore.getState().data?.stories).toEqual([]);
  });

  it('chat / following / status skip when already cached', async () => {
    useChatStore.setState({ data: { myChatRooms: [] }, isLoading: false });
    await useChatStore.getState().fetch();
    useFollowingStore.setState({ data: { me: null, clubs: [] }, isLoading: false });
    await useFollowingStore.getState().fetch();
    useStatusStore.setState({ data: { stories: [], myStories: [] }, isLoading: false });
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
      commentDelta: {},
    }),
  );

  it('setLike pushes an external like state into the override', () => {
    useExploreStore.getState().setLike('p1', { liked_by_me: true, like_count: 7 });
    expect(useExploreStore.getState().likeOverride.p1).toEqual({
      liked_by_me: true,
      like_count: 7,
    });
  });

  it('bumpComment accumulates the per-pod comment delta', () => {
    useExploreStore.getState().bumpComment('p1', 1);
    useExploreStore.getState().bumpComment('p1', 1);
    useExploreStore.getState().bumpComment('p1', -1);
    expect(useExploreStore.getState().commentDelta.p1).toBe(1);
  });

  it('toggleSave applies then reconciles with the server', async () => {
    mockRequest.mockResolvedValueOnce({
      toggleSavedPod: { pod_id: 'p1', saved: true, saved_pod_ids: ['p1'] },
    });
    await useExploreStore.getState().toggleSave('p1', false);
    expect(useExploreStore.getState().savedOverride.p1).toBe(true);
    expect('p1' in useExploreStore.getState().savePending).toBe(false);
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
      .mockResolvedValueOnce({ stories: [], myStories: [] });
    await useStatusStore
      .getState()
      .publish({ base64: 'abc', fileName: 'x.jpg', mimeType: 'image/jpeg' });
    expect(mockRequest).toHaveBeenCalledTimes(3);
    // The status post is tagged as an ephemeral STORY, not a permanent post.
    expect(mockRequest.mock.calls[1]?.[1]).toMatchObject({
      input: { kind: 'STORY', media_type: 'IMAGE' },
    });
  });

  it('publish streams a video story from its URI with a derived mp4 name', async () => {
    mockDirect.mockResolvedValue('https://img/raw.mp4');
    mockCompress.mockResolvedValue('https://img/c.mp4');
    mockRequest
      .mockResolvedValueOnce({ createPost: { id: 'po2' } })
      .mockResolvedValueOnce({ stories: [], myStories: [] });
    await useStatusStore.getState().publish({ uri: 'file://vid', mediaType: 'VIDEO' });
    expect(mockDirect.mock.calls[0]?.[0]).toMatchObject({ type: 'video/mp4' });
    expect(mockDirect.mock.calls[0]?.[0].name).toMatch(/^story-\d+\.mp4$/);
    expect(mockRequest.mock.calls[0]?.[1]).toMatchObject({
      input: { kind: 'STORY', media_type: 'VIDEO', image_url: 'https://img/c.mp4' },
    });
  });

  it('publish throws without media', async () => {
    await expect(useStatusStore.getState().publish({ base64: null })).rejects.toThrow(
      'No media selected.',
    );
  });

  it('deleteStory removes the post then refetches the feed', async () => {
    mockRequest
      .mockResolvedValueOnce({ deletePost: true })
      .mockResolvedValueOnce({ stories: [], myStories: [] });
    await useStatusStore.getState().deleteStory('s1');
    expect(mockRequest.mock.calls[0]?.[1]).toEqual({ id: 's1' });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('recordView marks a story seen once (tolerating a persist failure) and skips repeats', async () => {
    useStatusStore.setState({ seenIds: new Set() });
    mockRequest.mockRejectedValue(new Error('offline'));
    await useStatusStore.getState().recordView('st1');
    expect(useStatusStore.getState().seenIds.has('st1')).toBe(true);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    // Already seen → early return, no second persist.
    await useStatusStore.getState().recordView('st1');
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
