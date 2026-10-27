import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import FollowFeedList from '../FollowFeedList';
import { TOGGLE_LIKE } from '../../profile-page/queries';

const h = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('../FeedPostCard', () => ({
  default: (p: { post: { id: string; liked_by_me: boolean; likes_count: number }; club: { club_name: string } | null; onToggleLike: (post: unknown) => void; onOpenComments: (id: string) => void; onReport?: (id: string) => void }) => (
    <div data-testid={`post-${p.post.id}`} data-club={p.club?.club_name ?? ''} data-report={String(Boolean(p.onReport))}>
      <button data-testid={`like-${p.post.id}`} onClick={() => p.onToggleLike(p.post)} />
      <button data-testid={`comments-${p.post.id}`} onClick={() => p.onOpenComments(p.post.id)} />
    </div>
  ),
}));

const post = (id: string, over: object = {}) => ({ id, club_id: null, liked_by_me: false, likes_count: 3, ...over });
const clubs = new Map([
  ['c1', { id: 'c1', club_name: 'Run Club', super_category_id: 'sc1' }],
  ['c2', { id: 'c2', club_name: 'Pet Club', super_category_id: 'sc2' }],
]);

beforeEach(() => vi.clearAllMocks());

const list = (state: { data?: unknown; loading?: boolean; error?: Error }, props: object = {}, toggle = vi.fn().mockResolvedValue({})) => {
  h.useQuery.mockReturnValue({ data: state.data, loading: state.loading ?? false, error: state.error });
  h.useMutation.mockReturnValue([toggle]);
  const onOpenComments = vi.fn();
  render(<FollowFeedList source={'USERS' as never} emptyText="Nothing yet" onOpenComments={onOpenComments} {...props} />);
  return { toggle, onOpenComments };
};

describe('FollowFeedList', () => {
  it('asks for the sixty latest posts of the source', () => {
    list({ data: { followingFeed: [post('p1')] } });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { source: 'USERS', limit: 60 } });
    expect(screen.getByTestId('following-feed')).toBeInTheDocument();
  });

  it('shows a skeleton while loading with nothing yet', () => {
    list({ loading: true });
    expect(screen.getByTestId('following-feed-loading')).toBeInTheDocument();
  });

  it('shows the error', () => {
    list({ error: new Error('Feed down') });
    expect(screen.getByTestId('following-feed-error')).toHaveTextContent('Feed down');
  });

  it('shows the empty text when there are no posts, or the answer is missing', () => {
    list({ data: { followingFeed: [] } });
    expect(screen.getByTestId('following-feed-empty')).toHaveTextContent('Nothing yet');
  });

  it('shows the empty text when nothing came back at all', () => {
    list({ data: undefined });
    expect(screen.getByTestId('following-feed-empty')).toHaveTextContent('Nothing yet');
  });

  it('resolves each post club for its header and passes the report handler through', () => {
    const onReport = vi.fn();
    list({ data: { followingFeed: [post('p1', { club_id: 'c1' }), post('p2', { club_id: 'ghost' }), post('p3')] } }, { clubsById: clubs, onReport });
    expect(screen.getByTestId('post-p1')).toHaveAttribute('data-club', 'Run Club');
    expect(screen.getByTestId('post-p2')).toHaveAttribute('data-club', '');
    expect(screen.getByTestId('post-p3')).toHaveAttribute('data-club', '');
    expect(screen.getByTestId('post-p1')).toHaveAttribute('data-report', 'true');
  });

  it('treats a club id with no club map as unresolved', () => {
    list({ data: { followingFeed: [post('p1', { club_id: 'c1' })] } });
    expect(screen.getByTestId('post-p1')).toHaveAttribute('data-club', '');
  });

  it('narrows to the chosen super category, dropping posts with no club or another category', () => {
    list({ data: { followingFeed: [post('p1', { club_id: 'c1' }), post('p2', { club_id: 'c2' }), post('p3'), post('p4', { club_id: 'ghost' })] } }, { clubsById: clubs, superCategoryId: 'sc1' });
    expect(screen.getByTestId('post-p1')).toBeInTheDocument();
    ['p2', 'p3', 'p4'].forEach((id) => expect(screen.queryByTestId(`post-${id}`)).not.toBeInTheDocument());
  });

  it('shows the empty text when the filter leaves nothing, and drops everything without a club map', () => {
    list({ data: { followingFeed: [post('p1', { club_id: 'c1' })] } }, { superCategoryId: 'sc1' });
    expect(screen.getByTestId('following-feed-empty')).toBeInTheDocument();
  });

  it('opens comments for a post', () => {
    const { onOpenComments } = list({ data: { followingFeed: [post('p1')] } });
    fireEvent.click(screen.getByTestId('comments-p1'));
    expect(onOpenComments).toHaveBeenCalledWith('p1');
  });

  it('likes with an optimistic flip and count, and unlikes the other way', () => {
    const { toggle } = list({ data: { followingFeed: [post('p1'), post('p2', { liked_by_me: true, likes_count: 7 })] } });
    fireEvent.click(screen.getByTestId('like-p1'));
    fireEvent.click(screen.getByTestId('like-p2'));
    expect(h.useMutation).toHaveBeenCalledWith(TOGGLE_LIKE);
    expect(toggle.mock.calls[0][0]).toEqual({
      variables: { id: 'p1' },
      optimisticResponse: { togglePostLike: { __typename: 'Post', id: 'p1', liked_by_me: true, likes_count: 4 } },
    });
    expect(toggle.mock.calls[1][0].optimisticResponse.togglePostLike).toMatchObject({ liked_by_me: false, likes_count: 6 });
  });

  it('lets Apollo roll back a failed like without surfacing an error', async () => {
    const { toggle } = list({ data: { followingFeed: [post('p1')] } }, {}, vi.fn().mockRejectedValue(new Error('offline')));
    fireEvent.click(screen.getByTestId('like-p1'));
    await Promise.resolve();
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('following-feed')).toBeInTheDocument();
  });
});
