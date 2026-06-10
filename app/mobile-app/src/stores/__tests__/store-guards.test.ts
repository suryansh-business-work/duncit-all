import { graphqlRequest } from '@/services/graphql.client';
import { useChatStore } from '@/stores/chat.store';
import { useExploreStore } from '@/stores/explore.store';
import { useFollowingStore } from '@/stores/following.store';
import { useHomeStore } from '@/stores/home.store';
import { useStatusStore } from '@/stores/status.store';
import { useSurveyStore } from '@/stores/survey.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

describe('fetch guards skip while a request is already in flight', () => {
  it('chat: in-flight guard returns without a request', async () => {
    useChatStore.setState({ data: undefined, isLoading: true });
    await useChatStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('following: in-flight guard returns without a request', async () => {
    useFollowingStore.setState({ data: undefined, isLoading: true });
    await useFollowingStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('home: in-flight guard returns without a request', async () => {
    useHomeStore.setState({ data: undefined, isLoading: true });
    await useHomeStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('status: in-flight guard returns without a request', async () => {
    useStatusStore.setState({ data: undefined, isLoading: true });
    await useStatusStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('explore: skips when data is already cached and not forced', async () => {
    useExploreStore.setState({
      data: { me: null, clubs: [], pods: [] } as never,
      isLoading: false,
      savedOverride: {},
      savePending: {},
      likeOverride: {},
    });
    await useExploreStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('survey: skips while loading or once data is present', async () => {
    useSurveyStore.setState({ data: undefined, isLoading: true });
    await useSurveyStore.getState().fetch();
    useSurveyStore.setState({ data: { categories: [] } as never, isLoading: false });
    await useSurveyStore.getState().fetch();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('fetch error paths capture the error and clear loading', () => {
  it('chat: captures a fetch error', async () => {
    useChatStore.setState({ data: undefined, isLoading: false, error: undefined });
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await useChatStore.getState().fetch();
    expect(useChatStore.getState().error).toBeInstanceOf(Error);
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('following: captures a fetch error', async () => {
    useFollowingStore.setState({ data: undefined, isLoading: false, error: undefined });
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await useFollowingStore.getState().fetch();
    expect(useFollowingStore.getState().error).toBeInstanceOf(Error);
    expect(useFollowingStore.getState().isLoading).toBe(false);
  });

  it('status: captures a fetch error', async () => {
    useStatusStore.setState({ data: undefined, isLoading: false, error: undefined });
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await useStatusStore.getState().fetch();
    expect(useStatusStore.getState().error).toBeInstanceOf(Error);
    expect(useStatusStore.getState().isLoading).toBe(false);
  });

  it('explore: captures a fetch error', async () => {
    useExploreStore.setState({
      data: undefined,
      isLoading: false,
      error: undefined,
      savedOverride: {},
      savePending: {},
      likeOverride: {},
    });
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await useExploreStore.getState().fetch();
    expect(useExploreStore.getState().error).toBeInstanceOf(Error);
    expect(useExploreStore.getState().isLoading).toBe(false);
  });
});

describe('status publish derives sensible defaults', () => {
  it('falls back to a jpeg mime type and a generated file name', async () => {
    useStatusStore.setState({ data: undefined, isLoading: false });
    mockRequest
      .mockResolvedValueOnce({ uploadImageToImagekit: { url: 'https://img/x.jpg', fileId: 'f1' } })
      .mockResolvedValueOnce({ createPost: { id: 'po1', image_url: 'https://img/x.jpg' } })
      .mockResolvedValueOnce({ posts: [], myPosts: [] });

    await useStatusStore.getState().publish({ base64: 'abc' });

    const uploadVars = mockRequest.mock.calls[0][1];
    expect(uploadVars.mimeType).toBe('image/jpeg');
    expect(uploadVars.fileName).toMatch(/^status-\d+\.jpg$/);
    expect(uploadVars.fileBase64).toContain('data:image/jpeg;base64,abc');
  });
});
