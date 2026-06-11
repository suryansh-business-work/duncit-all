import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { IdeaDetailsSheet } from '@/components/pod-ideas';
import { usePodIdeaDetails, type PodIdeaDetail } from '@/hooks/usePodIdeas';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePodIdeas', () => ({ usePodIdeaDetails: jest.fn() }));
const mockedDetails = usePodIdeaDetails as jest.Mock;

const detail: PodIdeaDetail = {
  id: '1',
  author_id: 'u1',
  title: 'Open mic',
  description: 'A night of performances.',
  likes_count: 0,
  liked_by_me: false,
  shares_count: 0,
  comments_count: 0,
  status: 'APPROVED',
  created_at: new Date().toISOString(),
  author: { user_id: 'u1', full_name: 'Asha', first_name: 'Asha' },
  comments: [],
} as PodIdeaDetail;

const setup = (over: Record<string, unknown> = {}) => {
  const api = {
    idea: detail,
    isLoading: false,
    addComment: jest.fn().mockResolvedValue(undefined),
    deleteComment: jest.fn().mockResolvedValue(undefined),
    toggleLike: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
  mockedDetails.mockReturnValue(api);
  return api;
};

describe('IdeaDetailsSheet', () => {
  it('shows the loading spinner while the idea loads', () => {
    setup({ idea: null, isLoading: true });
    renderWithProviders(
      <IdeaDetailsSheet id="1" myId="me" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    expect(screen.getByTestId('idea-details-loading')).toBeOnTheScreen();
  });

  it('shows a not-found message when the idea is missing', () => {
    setup({ idea: null, isLoading: false });
    renderWithProviders(
      <IdeaDetailsSheet id="x" myId="me" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    expect(screen.getByTestId('idea-details-missing')).toBeOnTheScreen();
  });

  it('renders the idea, closes, and posts a comment', async () => {
    const api = setup();
    const onClose = jest.fn();
    renderWithProviders(
      <IdeaDetailsSheet id="1" myId="me" onClose={onClose} onChanged={jest.fn()} />,
    );
    expect(screen.getByText('Open mic')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'love it');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    await waitFor(() => expect(api.addComment).toHaveBeenCalledWith('love it'));

    fireEvent.press(screen.getByTestId('idea-details-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores an empty comment submit', () => {
    const api = setup();
    renderWithProviders(
      <IdeaDetailsSheet id="1" myId="me" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    expect(api.addComment).not.toHaveBeenCalled();
  });

  it('swallows a failed comment post', async () => {
    const api = setup({ addComment: jest.fn().mockRejectedValue(new Error('nope')) });
    renderWithProviders(
      <IdeaDetailsSheet id="1" myId="me" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'oops');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    await waitFor(() => expect(api.addComment).toHaveBeenCalled());
    expect(screen.getByText('Open mic')).toBeOnTheScreen();
  });
});
