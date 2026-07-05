import { fireEvent, screen } from '@testing-library/react-native';

import { FeedPostCard } from '@/components/following/FeedPostCard';
import { renderWithProviders } from '@/utils/test-utils';

const post = (over: Record<string, unknown> = {}): any => ({
  id: 'p1',
  author_id: 'u1',
  club_id: null,
  image_url: 'https://img/p.jpg',
  media_type: 'IMAGE',
  kind: 'POST',
  caption: 'Hello world',
  likes_count: 2,
  liked_by_me: false,
  comments_count: 3,
  created_at: '2026-06-10T10:00:00Z',
  author: { user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'a.jpg' },
  ...over,
});

const handlers = () => ({
  onToggleLike: jest.fn(),
  onOpenComments: jest.fn(),
  onOpenAuthor: jest.fn(),
});

describe('FeedPostCard', () => {
  it('renders author, caption, counts and fires all three actions', () => {
    const h = handlers();
    renderWithProviders(<FeedPostCard post={post()} {...h} />);
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('Hello world')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('feed-like-p1'));
    fireEvent.press(screen.getByTestId('feed-comment-p1'));
    fireEvent.press(screen.getByTestId('feed-author-p1'));
    expect(h.onToggleLike).toHaveBeenCalled();
    expect(h.onOpenComments).toHaveBeenCalled();
    expect(h.onOpenAuthor).toHaveBeenCalled();
  });

  it('shows the STORY chip for stories and a liked heart', () => {
    renderWithProviders(
      <FeedPostCard post={post({ kind: 'STORY', liked_by_me: true })} {...handlers()} />,
    );
    expect(screen.getByText('STORY')).toBeOnTheScreen();
  });

  it('falls back to an initial avatar, full_name, and hides missing media/caption', () => {
    renderWithProviders(
      <FeedPostCard
        post={post({
          image_url: '',
          caption: '',
          author: { user_id: 'u1', full_name: 'Asha Verma', first_name: null, profile_photo: null },
        })}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Asha Verma')).toBeOnTheScreen();
    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.queryByText('Hello world')).toBeNull();
  });

  it('handles a missing author entirely', () => {
    renderWithProviders(<FeedPostCard post={post({ author: null })} {...handlers()} />);
    expect(screen.getByText('Duncit member')).toBeOnTheScreen();
    expect(screen.getByText('D')).toBeOnTheScreen();
  });
});
