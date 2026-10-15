import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicProfilePosts from '../PublicProfilePosts';

/*
  Under test: which of the three grid states a profile shows (private lock,
  first-load skeleton, empty, posts), which tab panel renders, and that a post
  tile opens the post dialog. The query is the server's, so useQuery is a spy
  whose answer each case sets; stories, the post dialog and the pods panel have
  their own suites and are stubs that echo the props they were handed.
*/
interface QueryAnswer {
  data?: { posts?: { id: string; image_url: string; caption?: string | null }[]; stories?: { id: string }[] };
  loading: boolean;
}
const useQueryMock = vi.hoisted(() => vi.fn<(query: unknown, opts: { variables: { id: string }; skip: boolean }) => QueryAnswer>());
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: useQueryMock,
}));

vi.mock('../PublicProfileStories', () => ({
  default: (props: { name: string; stories: unknown[]; canReport: boolean }) => (
    <div data-testid="stories-stub">
      {props.name}|{props.stories.length}|{String(props.canReport)}
    </div>
  ),
}));

vi.mock('../../profile-page/post-dialog/PostDialog', () => ({
  default: (props: { postId: string | null; meId: string; onClose: () => void; onDeleted: () => void }) => (
    <div data-testid="post-dialog-stub" data-post-id={props.postId ?? ''} data-me-id={props.meId}>
      <button type="button" onClick={props.onClose}>
        close-dialog
      </button>
      <button type="button" onClick={props.onDeleted}>
        deleted-dialog
      </button>
    </div>
  ),
}));

vi.mock('../../../components/profile-tabs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../components/profile-tabs')>()),
  ProfilePodsPanel: (props: { userId: string; kind: string; requestFromHost?: string }) => (
    <div data-testid={`pods-panel-${props.kind}`}>
      {props.userId}|{props.requestFromHost ?? 'none'}
    </div>
  ),
}));

type Props = Parameters<typeof PublicProfilePosts>[0];

const renderPosts = (over: Partial<Props> = {}, url = '/u/asha') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <PublicProfilePosts
        userId="u1"
        canView
        meId="me1"
        name="Asha"
        photo={null}
        isHost={false}
        isOwner={false}
        {...over}
      />
    </MemoryRouter>,
  );

const POSTS = [
  { id: 'p1', image_url: 'https://img/p1.jpg', caption: 'Sunset run' },
  { id: 'p2', image_url: 'https://img/p2.jpg', caption: null },
];

beforeEach(() => {
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue({ data: { posts: POSTS, stories: [{ id: 's1' }] }, loading: false });
});

describe('PublicProfilePosts', () => {
  it('shows the private lock card and skips the fetch when the viewer may not see the account', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false });
    renderPosts({ canView: false });

    expect(screen.getByText('This account is private')).toBeInTheDocument();
    expect(screen.getByText('Follow this account to see their posts and status.')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-tabs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-dialog-stub')).not.toBeInTheDocument();
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: true, variables: { id: 'u1' } }));
  });

  it('renders a skeleton grid on the first load instead of "No posts yet."', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    renderPosts();

    expect(screen.getByTestId('public-posts-loading')).toBeInTheDocument();
    expect(screen.queryByText('No posts yet.')).not.toBeInTheDocument();
    expect(screen.getByTestId('stories-stub')).toHaveTextContent('Asha|0|true');
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: false }));
  });

  it('keeps showing the grid it already has while a refetch is in flight', () => {
    useQueryMock.mockReturnValue({ data: { posts: POSTS, stories: [] }, loading: true });
    renderPosts();

    expect(screen.queryByTestId('public-posts-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('public-profile-post-p1')).toBeInTheDocument();
  });

  it('says "No posts yet." once the fetch settles with nothing', () => {
    useQueryMock.mockReturnValue({ data: { posts: [], stories: [] }, loading: false });
    renderPosts();

    expect(screen.getByText('No posts yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('public-posts-loading')).not.toBeInTheDocument();
  });

  it('lists each post as a keyboard-reachable button, with the caption (or "post") as alt text', () => {
    renderPosts();

    const first = screen.getByTestId('public-profile-post-p1');
    expect(first.tagName).toBe('BUTTON');
    expect(first).toHaveAccessibleName('Open post');
    expect(screen.getByAltText('Sunset run')).toHaveAttribute('src', 'https://img/p1.jpg');
    expect(screen.getByAltText('post')).toHaveAttribute('src', 'https://img/p2.jpg');
    expect(screen.getByTestId('stories-stub')).toHaveTextContent('Asha|1|true');
  });

  it('opens the tapped post in the dialog and clears it on close and on delete', () => {
    renderPosts();
    const dialog = screen.getByTestId('post-dialog-stub');
    expect(dialog).toHaveAttribute('data-post-id', '');
    expect(dialog).toHaveAttribute('data-me-id', 'me1');

    fireEvent.click(screen.getByTestId('public-profile-post-p2'));
    expect(dialog).toHaveAttribute('data-post-id', 'p2');
    fireEvent.click(screen.getByText('close-dialog'));
    expect(dialog).toHaveAttribute('data-post-id', '');

    fireEvent.click(screen.getByTestId('public-profile-post-p1'));
    expect(dialog).toHaveAttribute('data-post-id', 'p1');
    fireEvent.click(screen.getByText('deleted-dialog'));
    expect(dialog).toHaveAttribute('data-post-id', '');
  });

  it('does not offer to report your own stories', () => {
    renderPosts({ isOwner: true });
    expect(screen.getByTestId('stories-stub')).toHaveTextContent('Asha|1|false');
  });

  it('renders the joined pods panel, not the grid, on the Joined tab', () => {
    renderPosts({}, '/u/asha?selectedtab=joined');

    expect(screen.getByTestId('pods-panel-joined')).toHaveTextContent('u1|none');
    expect(screen.queryByTestId('public-profile-post-p1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-tab-hosted')).not.toBeInTheDocument();
  });

  it('offers a pod request from the host on someone else’s hosted tab', () => {
    renderPosts({ isHost: true }, '/u/asha?selectedtab=hosted');

    expect(screen.getByTestId('profile-tab-hosted')).toHaveTextContent('Their Pods');
    expect(screen.getByTestId('pods-panel-hosted')).toHaveTextContent('u1|Asha');
  });

  it('does not offer a request to yourself on your own hosted tab', () => {
    renderPosts({ isHost: true, isOwner: true }, '/u/asha?selectedtab=hosted');

    expect(screen.getByTestId('pods-panel-hosted')).toHaveTextContent('u1|none');
  });
});
