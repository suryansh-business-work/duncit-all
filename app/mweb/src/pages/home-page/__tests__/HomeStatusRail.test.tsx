import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import HomeStatusRail from '../HomeStatusRail';
import { DELETE_STORY_POST, RECORD_STORY_VIEW, TOGGLE_STORY_LIKE } from '../queries';

// Heavy leaf components are covered by their own tests — here we swap them for
// lightweight doubles that surface the props the rail wires up so we can drive
// the rail's own branching logic.
vi.mock('../MyStatusUploadTile', () => ({
  default: ({ onView }: any) => (
    <button type="button" data-testid="my-status" onClick={onView}>
      my status
    </button>
  ),
}));

vi.mock('../StoryViewersDialog', () => ({
  default: ({ storyId, onClose }: any) =>
    storyId ? (
      <div data-testid="viewers-dialog">
        <span data-testid="viewers-id">{storyId}</span>
        <button type="button" data-testid="vd-close" onClick={onClose}>
          close viewers
        </button>
      </div>
    ) : null,
}));

vi.mock('../../../components/ads/AdSlot', () => ({
  default: () => <div data-testid="ad-slot" />,
}));

vi.mock('../HomeStatusViewer', () => ({
  default: ({
    item,
    onClose,
    onNext,
    onPrev,
    onDelete,
    onViewers,
    onToggleLike,
    onRecordView,
  }: any) =>
    item ? (
      <div data-testid="viewer">
        <span data-testid="viewer-label">{item.label}</span>
        <span data-testid="viewer-kind">{item.kind}</span>
        <button type="button" data-testid="v-close" onClick={onClose}>
          close
        </button>
        <button type="button" data-testid="v-next" onClick={onNext}>
          next
        </button>
        <button type="button" data-testid="v-prev" onClick={onPrev}>
          prev
        </button>
        {onDelete && (
          <button type="button" data-testid="v-delete" onClick={() => onDelete('story-1')}>
            delete
          </button>
        )}
        {onViewers && (
          <button type="button" data-testid="v-viewers" onClick={() => onViewers('story-1')}>
            viewers
          </button>
        )}
        {onToggleLike && (
          <button type="button" data-testid="v-like" onClick={() => onToggleLike('post-1')}>
            like
          </button>
        )}
        {onRecordView && (
          <button type="button" data-testid="v-record" onClick={() => onRecordView('post-1')}>
            record
          </button>
        )}
      </div>
    ) : null,
}));

const me = {
  full_name: 'Me User',
  first_name: 'Me',
  profile_photo: 'http://x/me.jpg',
  my_stories: [
    { id: 'story-1', image_url: 'http://x/s1.jpg', media_type: 'IMAGE', caption: 'Hi' },
  ],
};

const club = {
  id: 'c1',
  club_id: 'acme',
  club_name: 'Acme Club',
  club_feature_images_and_videos: [{ url: 'http://x/club.jpg', type: 'IMAGE' }],
  club_moments: [{ url: 'http://x/moment.jpg', type: 'IMAGE' }],
};

const pod = {
  id: 'p1',
  pod_id: 'pod9',
  pod_title: 'Sunset Pod',
  club_slug: 'acme',
  pod_images_and_videos: [{ url: 'http://x/pod.jpg', type: 'IMAGE' }],
};

const user = {
  user_id: 'u1',
  full_name: 'Asha Kumar',
  first_name: 'Asha',
  profile_photo: 'http://x/asha.jpg',
};

const post = {
  id: 'post-1',
  author_id: 'u1',
  image_url: 'http://x/post.jpg',
  media_type: 'IMAGE',
  caption: 'Post cap',
  seen_by_me: false,
  likes_count: 2,
  liked_by_me: false,
};

const mutationMocks = [
  {
    request: { query: RECORD_STORY_VIEW, variables: { id: 'post-1' } },
    result: { data: { recordStoryView: { id: 'post-1', seen_by_me: true, views_count: 1 } } },
  },
  {
    request: { query: TOGGLE_STORY_LIKE, variables: { id: 'post-1' } },
    result: { data: { togglePostLike: { id: 'post-1', liked_by_me: true, likes_count: 3 } } },
  },
  {
    request: { query: DELETE_STORY_POST, variables: { id: 'story-1' } },
    result: { data: { deletePost: true } },
  },
];

function renderRail(props: Partial<Parameters<typeof HomeStatusRail>[0]> = {}) {
  const merged = {
    me,
    followedClubs: [],
    hostPods: [],
    followedUsers: [],
    followedPosts: [],
    ...props,
  };
  return render(
    <MockedProvider mocks={mutationMocks} addTypename={false}>
      <HomeStatusRail {...(merged as any)} />
    </MockedProvider>,
  );
}

describe('HomeStatusRail', () => {
  it('renders the my-status tile and ad slot with no followed entries', () => {
    renderRail();
    expect(screen.getByTestId('my-status')).toBeInTheDocument();
    expect(screen.getByTestId('ad-slot')).toBeInTheDocument();
    // Viewer stays closed initially.
    expect(screen.queryByTestId('viewer')).toBeNull();
  });

  it('renders a tile per followed club, pod and user', () => {
    renderRail({ followedClubs: [club], hostPods: [pod], followedUsers: [user], followedPosts: [post] });
    expect(screen.getByText('Acme Club')).toBeInTheDocument();
    expect(screen.getByText('Sunset Pod')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });

  it('opens the "mine" viewer from the my-status tile and wires delete + viewers', async () => {
    renderRail();
    fireEvent.click(screen.getByTestId('my-status'));

    expect(screen.getByTestId('viewer-kind')).toHaveTextContent('mine');
    expect(screen.getByTestId('viewer-label')).toHaveTextContent('Me User');
    // Mine-only affordances are present; user-only ones are not.
    expect(screen.getByTestId('v-delete')).toBeInTheDocument();
    expect(screen.getByTestId('v-viewers')).toBeInTheDocument();
    expect(screen.queryByTestId('v-like')).toBeNull();
    expect(screen.queryByTestId('v-record')).toBeNull();

    // Viewers dialog opens then closes.
    fireEvent.click(screen.getByTestId('v-viewers'));
    expect(screen.getByTestId('viewers-id')).toHaveTextContent('story-1');
    fireEvent.click(screen.getByTestId('vd-close'));
    expect(screen.queryByTestId('viewers-dialog')).toBeNull();
  });

  it('confirms delete: opens ConfirmDialog and fires the delete mutation', async () => {
    renderRail();
    fireEvent.click(screen.getByTestId('my-status'));
    fireEvent.click(screen.getByTestId('v-delete'));

    // ConfirmDialog is real MUI.
    expect(screen.getByText('Delete story?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    // Viewer closes synchronously on confirm; the dialog fades out.
    expect(screen.queryByTestId('viewer')).toBeNull();
    await waitFor(() => expect(screen.queryByText('Delete story?')).toBeNull());
  });

  it('cancels the delete confirmation without deleting', async () => {
    renderRail();
    fireEvent.click(screen.getByTestId('my-status'));
    fireEvent.click(screen.getByTestId('v-delete'));
    expect(screen.getByText('Delete story?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete story?')).toBeNull());
    // Viewer remains open since we only closed the confirm dialog.
    expect(screen.getByTestId('viewer')).toBeInTheDocument();
  });

  it('opens a "user" viewer and wires like + record view', () => {
    renderRail({ followedUsers: [user], followedPosts: [post] });
    fireEvent.click(screen.getByText('Asha'));

    expect(screen.getByTestId('viewer-kind')).toHaveTextContent('user');
    expect(screen.getByTestId('v-like')).toBeInTheDocument();
    expect(screen.getByTestId('v-record')).toBeInTheDocument();
    // Mine-only affordances absent for a follower story.
    expect(screen.queryByTestId('v-delete')).toBeNull();
    expect(screen.queryByTestId('v-viewers')).toBeNull();

    fireEvent.click(screen.getByTestId('v-like'));
    fireEvent.click(screen.getByTestId('v-record'));
  });

  it('opens a "club" viewer without like/delete/viewers affordances', () => {
    // No my_stories → offset 0, so the club tile maps to viewer index 0.
    renderRail({ me: { full_name: 'Me' }, followedClubs: [club] });
    fireEvent.click(screen.getByText('Acme Club'));
    expect(screen.getByTestId('viewer-kind')).toHaveTextContent('club');
    expect(screen.queryByTestId('v-like')).toBeNull();
    expect(screen.queryByTestId('v-delete')).toBeNull();
    expect(screen.queryByTestId('v-viewers')).toBeNull();
  });

  it('navigates next past the last story to close the viewer', () => {
    renderRail({ followedUsers: [user], followedPosts: [post] });
    fireEvent.click(screen.getByText('Asha'));
    expect(screen.getByTestId('viewer')).toBeInTheDocument();
    // Single entry at the end of the sequence → next closes.
    fireEvent.click(screen.getByTestId('v-next'));
    expect(screen.queryByTestId('viewer')).toBeNull();
  });

  it('prev stays put at the first slide and close dismisses the viewer', () => {
    renderRail();
    fireEvent.click(screen.getByTestId('my-status'));
    // index 0 → prev keeps it at 0 (viewer still open).
    fireEvent.click(screen.getByTestId('v-prev'));
    expect(screen.getByTestId('viewer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('v-close'));
    expect(screen.queryByTestId('viewer')).toBeNull();
  });
});
