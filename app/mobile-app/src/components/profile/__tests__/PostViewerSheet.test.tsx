import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PostViewerSheet } from '@/components/profile/post-viewer/PostViewerSheet';
import { usePostViewer, type PostDetail } from '@/hooks/usePostViewer';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePostViewer', () => ({ usePostViewer: jest.fn() }));
const mockedViewer = usePostViewer as jest.Mock;

const mockSharePost = jest.fn();
jest.mock('@/utils/share', () => ({ sharePost: (...a: unknown[]) => mockSharePost(...a) }));
beforeEach(() => mockSharePost.mockClear());

const post: PostDetail = {
  id: 'p1',
  author_id: 'me',
  author: { user_id: 'me', full_name: 'Sam Lee', first_name: 'Sam', profile_photo: null },
  image_url: 'https://i/a.jpg',
  caption: 'sunset',
  likes_count: 2,
  liked_by_me: true,
  comments_count: 2,
  comments: [
    {
      id: 'c1',
      author_id: 'me',
      text: 'mine',
      created_at: new Date().toISOString(),
      author: { user_id: 'me', full_name: 'Sam Lee', first_name: 'Sam' },
    },
    {
      id: 'c2',
      author_id: 'other',
      text: 'theirs',
      created_at: new Date().toISOString(),
      author: null,
    },
  ],
  created_at: new Date().toISOString(),
} as PostDetail;

const setup = (over: Record<string, unknown> = {}) => {
  const api = {
    post,
    isLoading: false,
    toggleLike: jest.fn().mockResolvedValue(undefined),
    addComment: jest.fn().mockResolvedValue(undefined),
    deleteComment: jest.fn().mockResolvedValue(undefined),
    deletePost: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
  mockedViewer.mockReturnValue(api);
  return api;
};

describe('PostViewerSheet', () => {
  it('shows the loading and missing states', () => {
    setup({ post: null, isLoading: true });
    const { rerender } = renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(screen.getByTestId('post-viewer-loading')).toBeOnTheScreen();

    setup({ post: null, isLoading: false });
    rerender(<PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />);
    expect(screen.getByTestId('post-viewer-missing')).toBeOnTheScreen();
  });

  it('renders the post, likes it and deletes own/any comments as the owner', () => {
    const api = setup();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(screen.getByTestId('post-viewer-image')).toBeOnTheScreen();
    expect(screen.getByText('sunset')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('post-like'));
    expect(api.toggleLike).toHaveBeenCalled();

    // Post owner can delete any comment (own + others').
    fireEvent.press(screen.getByTestId('post-comment-delete-c2'));
    expect(api.deleteComment).toHaveBeenCalledWith('c2');
  });

  it('posts a comment and ignores empty submits', async () => {
    const api = setup();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    expect(api.addComment).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'lovely');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    await waitFor(() => expect(api.addComment).toHaveBeenCalledWith('lovely'));
  });

  it('keeps the draft when posting a comment fails', async () => {
    const api = setup({ addComment: jest.fn().mockRejectedValue(new Error('nope')) });
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'oops');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    await waitFor(() => expect(api.addComment).toHaveBeenCalled());
    expect(screen.getByTestId('post-viewer-image')).toBeOnTheScreen();
  });

  it('deletes the post as the owner and notifies the grid', async () => {
    const api = setup();
    const onDeleted = jest.fn();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={onDeleted} />,
    );
    fireEvent.press(screen.getByTestId('post-viewer-delete'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(api.deletePost).toHaveBeenCalled();
  });

  it('keeps the viewer open when the delete fails', async () => {
    const api = setup({ deletePost: jest.fn().mockRejectedValue(new Error('boom')) });
    const onDeleted = jest.fn();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={onDeleted} />,
    );
    fireEvent.press(screen.getByTestId('post-viewer-delete'));
    await waitFor(() => expect(api.deletePost).toHaveBeenCalled());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('hides the delete affordance for non-owners and closes', () => {
    setup({ post: { ...post, author_id: 'someone-else' } });
    const onClose = jest.fn();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={onClose} onDeleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('post-viewer-delete')).toBeNull();
    fireEvent.press(screen.getByTestId('post-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('hides comment deletes for signed-out viewers (no meId)', () => {
    setup();
    renderWithProviders(<PostViewerSheet postId="p1" onClose={jest.fn()} onDeleted={jest.fn()} />);
    expect(screen.queryByTestId('post-comment-delete-c1')).toBeNull();
    expect(screen.queryByTestId('post-comment-delete-c2')).toBeNull();
  });

  it('ignores a second delete tap while the first is in flight', async () => {
    let resolveDelete: () => void = () => undefined;
    const api = setup({
      deletePost: jest.fn(() => new Promise<void>((res) => (resolveDelete = res))),
    });
    const onDeleted = jest.fn();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={onDeleted} />,
    );
    fireEvent.press(screen.getByTestId('post-viewer-delete'));
    fireEvent.press(screen.getByTestId('post-viewer-delete'));
    expect(api.deletePost).toHaveBeenCalledTimes(1);
    resolveDelete();
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('shows the empty comments state and skips the image when absent (unliked)', () => {
    setup({
      post: {
        ...post,
        image_url: null,
        caption: null,
        comments: [],
        comments_count: 0,
        liked_by_me: false,
      },
    });
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(screen.getByTestId('post-comments-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('post-viewer-image')).toBeNull();
  });

  it('shares the post via the header action', () => {
    setup();
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('post-viewer-share'));
    expect(mockSharePost).toHaveBeenCalledWith('p1', 'Sam Lee');
  });

  it('shares with a default title when the author has no name', () => {
    setup({ post: { ...post, author: null } });
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('post-viewer-share'));
    expect(mockSharePost).toHaveBeenCalledWith('p1', 'Post');
  });

  it('double-tap does not re-like an already-liked post', () => {
    const api = setup(); // fixture post is liked_by_me: true
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(1000)
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('post-media'));
    fireEvent.press(screen.getByTestId('post-media'));
    expect(api.toggleLike).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('double-tap likes an unliked post once', () => {
    const api = setup({ post: { ...post, liked_by_me: false } });
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
    renderWithProviders(
      <PostViewerSheet postId="p1" meId="me" onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('post-media'));
    fireEvent.press(screen.getByTestId('post-media'));
    expect(api.toggleLike).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });
});
