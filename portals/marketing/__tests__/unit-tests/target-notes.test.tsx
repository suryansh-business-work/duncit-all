import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { makeSocialPublishTarget, makeSocialScheduledPost } from '../mocks';
import TargetNotes from '../../src/pages/social-accounts-page/publish/TargetNotes';
import ScheduledPostCard from '../../src/pages/social-accounts-page/publish/ScheduledPostCard';

describe('TargetNotes', () => {
  it('says why a network refused, why one waits to be tried again, and why a first comment did not go', () => {
    renderWithProviders(
      <TargetNotes
        targets={[
          makeSocialPublishTarget({ account_id: 'a', account_name: 'Duncit X', status: 'FAILED', error: 'X: duplicate post' }),
          makeSocialPublishTarget({ account_id: 'b', account_name: 'Duncit Threads', status: 'PENDING', error: 'Threads: Service unavailable' }),
          makeSocialPublishTarget({ account_id: 'c', account_name: 'Duncit Gram', status: 'PUBLISHED', first_comment_error: 'Instagram: comments are off' }),
          makeSocialPublishTarget({ account_id: 'd', account_name: 'Duncit Pages', status: 'PENDING' }),
          makeSocialPublishTarget({ account_id: 'e', account_name: 'Duncit FB', status: 'FAILED', error: null }),
        ]}
      />
    );
    expect(screen.getByTestId('social-post-note-a-failed')).toHaveTextContent('Duncit X: X: duplicate post');
    expect(screen.getByTestId('social-post-note-b-retry')).toHaveTextContent('Duncit Threads: trying again shortly — Threads: Service unavailable');
    expect(screen.getByTestId('social-post-note-c-comment')).toHaveTextContent('Duncit Gram: posted, but the first comment did not go — Instagram: comments are off');
    expect(screen.queryByTestId('social-post-note-d-retry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-post-note-e-failed')).not.toBeInTheDocument();
  });
});

describe('ScheduledPostCard post type', () => {
  it('marks a reel or a story, and says nothing extra for a feed post', () => {
    const { unmount } = renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ id: 'r', post_type: 'REEL' })} onEdit={vi.fn()} />);
    expect(screen.getByText('Reel')).toBeInTheDocument();
    unmount();
    const story = renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ id: 's', post_type: 'STORY' })} onEdit={vi.fn()} />);
    expect(screen.getByText('Story')).toBeInTheDocument();
    story.unmount();
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ id: 'f' })} onEdit={vi.fn()} />);
    expect(screen.queryByText('Reel')).not.toBeInTheDocument();
    expect(screen.queryByText('Story')).not.toBeInTheDocument();
  });
});
