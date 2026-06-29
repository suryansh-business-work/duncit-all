import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodCommentsSheet } from '@/components/details/pod-comments';
import { usePodComments } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDetails', () => ({ usePodComments: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => true, goBack: jest.fn() }),
}));

const mockComments = usePodComments as jest.Mock;

const comment = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  author_id: 'me',
  author_name: 'Me',
  author_photo: 'https://img/me.jpg',
  text: 'Mine',
  like_count: 0,
  liked_by_me: false,
  created_at: '2026-06-01T00:00:00.000Z',
  ...over,
});

const baseThread = {
  comments: [
    comment(),
    comment({
      id: 'c2',
      author_id: 'other',
      author_name: null,
      author_photo: null,
      text: 'Theirs',
      like_count: 3,
      liked_by_me: true,
      created_at: 'not-a-date',
    }),
    comment({
      id: 'c3',
      author_id: 'other',
      author_name: 'Other',
      author_photo: null,
      text: 'Counted but not mine',
      like_count: 2,
      liked_by_me: false,
    }),
  ],
  isLoading: false,
  error: null,
  add: jest.fn(),
  remove: jest.fn(),
  toggleLike: jest.fn(),
};

const renderSheet = (props: Partial<Parameters<typeof PodCommentsSheet>[0]> = {}) =>
  renderWithProviders(
    <PodCommentsSheet
      podId="p1"
      open
      viewerId="me"
      onClose={jest.fn()}
      onCountChange={jest.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  mockComments.mockReset();
  mockNavigate.mockClear();
});

describe('PodCommentsSheet', () => {
  it('lists comments (photo + initial fallback) and likes one (item 4)', () => {
    const toggleLike = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, toggleLike });
    renderSheet();
    expect(screen.getByText('Mine')).toBeOnTheScreen();
    expect(screen.getByText('Theirs')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen(); // c2 like count
    fireEvent.press(screen.getByTestId('comment-like-c1'));
    expect(toggleLike).toHaveBeenCalledWith('c1');
  });

  it('long-presses the viewer own comment, confirms, and deletes (item 5)', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const onCountChange = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, remove });
    renderSheet({ onCountChange });

    // Cancel first — no delete.
    fireEvent(screen.getByTestId('comment-row-c1'), 'longPress');
    expect(screen.getByTestId('comment-delete-confirm')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('comment-delete-cancel'));
    expect(screen.queryByTestId('comment-delete-confirm')).toBeNull();
    expect(remove).not.toHaveBeenCalled();

    // Confirm — deletes.
    fireEvent(screen.getByTestId('comment-row-c1'), 'longPress');
    fireEvent.press(screen.getByTestId('comment-delete-confirm-btn'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c1'));
    expect(onCountChange).toHaveBeenCalledWith(-1);
  });

  it('keeps the count unchanged (no unhandled rejection) when delete fails (review fix)', async () => {
    const remove = jest.fn().mockRejectedValue(new Error('offline'));
    const onCountChange = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, remove });
    renderSheet({ onCountChange });

    fireEvent(screen.getByTestId('comment-row-c1'), 'longPress');
    fireEvent.press(screen.getByTestId('comment-delete-confirm-btn'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c1'));
    // The rejection is swallowed in confirmDelete, so the badge is not decremented.
    expect(onCountChange).not.toHaveBeenCalled();
  });

  it('opens a commenter profile from their avatar/name (item 11)', () => {
    const onClose = jest.fn();
    mockComments.mockReturnValue(baseThread);
    renderSheet({ onClose });
    fireEvent.press(screen.getByTestId('comment-name-c2'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'other' });
  });

  it('adds a comment through the composer with the viewer avatar', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const onCountChange = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, comments: [], add });
    renderSheet({ onCountChange, viewerPhoto: 'https://img/v.jpg' });
    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'Hello');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    await waitFor(() => expect(add).toHaveBeenCalledWith('Hello'));
    expect(onCountChange).toHaveBeenCalledWith(1);
  });

  it('ignores blank or signed-out sends', () => {
    const add = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, comments: [], add });
    renderSheet({ viewerId: null });
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    expect(add).not.toHaveBeenCalled();
  });

  it('shows the empty, loading and error states', () => {
    mockComments.mockReturnValue({ ...baseThread, comments: [] });
    const { rerender } = renderSheet();
    expect(screen.getByTestId('pod-comments-empty')).toBeOnTheScreen();

    mockComments.mockReturnValue({ ...baseThread, isLoading: true });
    rerender(
      <PodCommentsSheet
        podId="p1"
        open
        viewerId="me"
        onClose={jest.fn()}
        onCountChange={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('pod-comments-empty')).toBeNull();

    mockComments.mockReturnValue({ ...baseThread, error: 'boom' });
    rerender(
      <PodCommentsSheet
        podId="p1"
        open
        viewerId="me"
        onClose={jest.fn()}
        onCountChange={jest.fn()}
      />,
    );
    expect(screen.getByText('boom')).toBeOnTheScreen();
  });

  it('closes from the header', () => {
    const onClose = jest.fn();
    mockComments.mockReturnValue(baseThread);
    renderSheet({ onClose });
    fireEvent.press(screen.getByTestId('pod-comments-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
