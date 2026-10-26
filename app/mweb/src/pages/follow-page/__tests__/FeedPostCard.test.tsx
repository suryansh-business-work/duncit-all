import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import FeedPostCard from '../FeedPostCard';
import { fallbackT } from '../../../i18n/fallback';
import type { FeedClub, FeedPost } from '../queries';

vi.mock('../../../components/content-report/ContentActionsMenu', () => ({
  default: (p: { canReport: boolean; onReport: () => void; canDelete: boolean }) => (
    <button data-testid="menu" data-can-report={String(p.canReport)} data-can-delete={String(p.canDelete)} onClick={p.onReport} />
  ),
}));

const post = (over: Partial<FeedPost> = {}): FeedPost => ({
  id: 'p1',
  author_id: 'a1',
  image_url: 'https://img/x.jpg',
  media_type: 'IMAGE',
  caption: 'Sunny day',
  likes_count: 3,
  liked_by_me: false,
  comments_count: 2,
  created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  author: { full_name: 'Asha Rao', profile_photo: 'https://img/a.jpg' } as FeedPost['author'],
  ...over,
});

const club: FeedClub = { id: 'c1', club_id: 'cl1', club_name: 'Run Club', club_feature_images_and_videos: null };

const view = (p: FeedPost, extra: Partial<Parameters<typeof FeedPostCard>[0]> = {}) => {
  const props = { onToggleLike: vi.fn(), onOpenComments: vi.fn(), ...extra };
  const utils = render(
    <MemoryRouter>
      <FeedPostCard post={p} {...props} />
    </MemoryRouter>
  );
  return { ...props, container: utils.container };
};

describe('FeedPostCard', () => {
  it('shows the author, relative time, image, counts and caption, linking to the profile', () => {
    view(post());
    expect(screen.getByTestId('feed-author-p1')).toHaveAttribute('href', '/u/a1');
    expect(screen.getByTestId('feed-author-p1')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('feed-author-p1')).toHaveTextContent('3 hours ago');
    expect(screen.getByRole('img', { name: 'Sunny day' })).toHaveAttribute('src', 'https://img/x.jpg');
    expect(screen.getByText('Sunny day')).toBeInTheDocument();
    expect(screen.getByTestId('feed-like-p1')).toHaveAccessibleName(fallbackT('mweb.explore.like'));
  });

  it('uses the club as the header and a group icon when a club is resolved', () => {
    view(post(), { club });
    expect(screen.getByTestId('feed-author-p1')).toHaveAttribute('href', '/club/cl1');
    expect(screen.getByTestId('feed-author-p1')).toHaveTextContent('Run Club');
    expect(screen.getByTestId('GroupsIcon')).toBeInTheDocument();
  });

  it('falls back to a letter avatar, "post" alt and no caption block', () => {
    view(post({ author: { full_name: '', first_name: '' } as FeedPost['author'], caption: '' }));
    expect(screen.getByRole('img', { name: 'post' })).toBeInTheDocument();
    expect(screen.getByTestId('feed-author-p1')).toHaveTextContent('U');
  });

  it('plays a video post with native controls', () => {
    const { container } = view(post({ media_type: 'VIDEO' }));
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://img/x.jpg');
    expect(video).toHaveAttribute('controls');
    expect(screen.queryByRole('img', { name: 'Sunny day' })).not.toBeInTheDocument();
  });

  it('toggles like, opens comments, and reports through the menu', () => {
    const onReport = vi.fn();
    const props = view(post({ liked_by_me: true }), { onReport });
    expect(screen.getByTestId('feed-like-p1')).toHaveAccessibleName(fallbackT('mweb.a11y.unlike'));
    fireEvent.click(screen.getByTestId('feed-like-p1'));
    expect(props.onToggleLike).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    fireEvent.click(screen.getByTestId('feed-comment-p1'));
    expect(props.onOpenComments).toHaveBeenCalledWith('p1');
    expect(screen.getByTestId('menu')).toHaveAttribute('data-can-report', 'true');
    expect(screen.getByTestId('menu')).toHaveAttribute('data-can-delete', 'false');
    fireEvent.click(screen.getByTestId('menu'));
    expect(onReport).toHaveBeenCalledWith('p1');
  });

  it('offers no report when no handler is given', () => {
    view(post());
    expect(screen.getByTestId('menu')).toHaveAttribute('data-can-report', 'false');
    fireEvent.click(screen.getByTestId('menu'));
  });
});
