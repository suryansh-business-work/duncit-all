import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodCommentsSheet } from '@/components/details/pod-comments';
import { usePodComments } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDetails', () => ({ usePodComments: jest.fn() }));

const mockComments = usePodComments as jest.Mock;

const baseThread = {
  comments: [
    {
      id: 'c1',
      author_id: 'me',
      author_name: 'Me',
      text: 'Mine',
      created_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'c2',
      author_id: 'other',
      author_name: null,
      text: 'Theirs',
      created_at: 'not-a-date',
    },
  ],
  isLoading: false,
  error: null,
  add: jest.fn(),
  remove: jest.fn(),
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

beforeEach(() => mockComments.mockReset());

describe('PodCommentsSheet', () => {
  it('lists comments and deletes the viewer own comment', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const onCountChange = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, remove });
    renderSheet({ onCountChange });
    expect(screen.getByText('Mine')).toBeOnTheScreen();
    expect(screen.getByText('Theirs')).toBeOnTheScreen();
    expect(screen.queryByTestId('comment-delete-c2')).toBeNull();
    fireEvent.press(screen.getByTestId('comment-delete-c1'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c1'));
    expect(onCountChange).toHaveBeenCalledWith(-1);
  });

  it('adds a comment through the composer', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const onCountChange = jest.fn();
    mockComments.mockReturnValue({ ...baseThread, comments: [], add });
    renderSheet({ onCountChange });
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
