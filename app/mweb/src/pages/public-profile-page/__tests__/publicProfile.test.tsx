import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import PublicProfileHeader from '../PublicProfileHeader';
import PublicProfileBadges from '../PublicProfileBadges';
import PublicProfileStories from '../PublicProfileStories';
import ProfileActionsMenu from '../ProfileActionsMenu';
import PublicProfileOwnerActions from '../PublicProfileOwnerActions';
import PublicProfilePage from '../PublicProfilePage';
import { useProfileBlock } from '../useProfileBlock';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  confirm: vi.fn(),
  notify: vi.fn(),
  meta: vi.fn(),
  // A block drops the cached feeds so they refetch without the blocked member.
  client: { cache: { evict: vi.fn(), gc: vi.fn() } },
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation, useApolloClient: () => h.client }));
vi.mock('@duncit/dialogs', async (orig) => ({ ...(await orig<object>()), useConfirm: () => h.confirm }));
vi.mock('../../../components/notify', () => ({ notify: h.notify, notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('../../../app/pageMeta', () => ({ useEntityPageMeta: h.meta }));
vi.mock('../../../components/FollowListDialog', () => ({
  default: (p: { open: boolean; initialTab: string; userId: string; viewerId?: string; onClose: () => void }) =>
    p.open ? (
      <div data-testid="follow-list" data-tab={p.initialTab} data-user={p.userId} data-viewer={String(p.viewerId)}>
        <button data-testid="follow-list-close" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../../../components/badges/BadgeDetailsSheet', () => ({
  default: (p: { open: boolean; badge?: { title: string }; awardedAt?: string; awardedReason?: string; onClose: () => void }) =>
    p.open ? (
      <div data-testid="badge-sheet" data-title={p.badge?.title} data-at={p.awardedAt} data-reason={p.awardedReason}>
        <button data-testid="badge-close" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../../home-page/HomeStatusViewer', () => ({
  default: (p: { item: { slides: unknown[] }; startIndex: number; canReport: boolean; onClose: () => void }) => (
    <div data-testid="viewer" data-start={p.startIndex} data-report={String(p.canReport)} data-slides={p.item.slides.length}>
      <button data-testid="viewer-close" onClick={p.onClose} />
    </div>
  ),
}));
vi.mock('../../../components/content-report/ReportContentDialog', () => ({
  default: (p: { targetId: string | null; kind: string; onClose: () => void }) =>
    p.targetId ? (
      <div data-testid="report" data-target={p.targetId} data-kind={p.kind}>
        <button data-testid="report-close" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../PublicProfilePosts', () => ({ default: (p: Record<string, unknown>) => <div data-testid="posts" data-can-view={String(p.canView)} data-owner={String(p.isOwner)} data-host={String(p.isHost)} data-name={String(p.name)} data-me={String(p.meId)} /> }));
vi.mock('../ProfileFollowActions', () => ({ default: (p: { profile: { user_id: string } }) => <div data-testid="follow-actions" data-user={p.profile.user_id} /> }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: React.ReactNode, path = '/start') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/start" element={ui} />
        <Route path="/u/:handle" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());

describe('PublicProfileHeader', () => {
  const user = (over: object = {}) => ({ user_id: 'u1', username: 'asha', full_name: 'Asha Rao', profile_photo: 'https://img/a.jpg', bio: 'Runner', city: 'Pune', zone: 'Kothrud', followers_count: 12, following_count: 7, ...over });

  it('shows the name, handle, place, bio and the follower counts', () => {
    render(<PublicProfileHeader user={user()} viewerId="me" />);
    expect(screen.getByTestId('public-profile-header-name')).toHaveTextContent('Asha Rao');
    expect(screen.getByText('@asha')).toBeInTheDocument();
    expect(screen.getByText('Kothrud, Pune')).toBeInTheDocument();
    expect(screen.getByText('Runner')).toBeInTheDocument();
    expect(screen.getByTestId('public-profile-header-stat-followers')).toHaveTextContent('12');
    expect(screen.getByTestId('public-profile-header-stat-following')).toHaveTextContent('7');
  });

  it('opens the followers list and the following list for this member, as the viewer', () => {
    render(<PublicProfileHeader user={user()} viewerId="me" />);
    fireEvent.click(screen.getByTestId('public-profile-header-stat-followers'));
    expect(screen.getByTestId('follow-list')).toHaveAttribute('data-tab', 'followers');
    expect(screen.getByTestId('follow-list')).toHaveAttribute('data-user', 'u1');
    expect(screen.getByTestId('follow-list')).toHaveAttribute('data-viewer', 'me');
    fireEvent.click(screen.getByTestId('follow-list-close'));
    fireEvent.click(screen.getByTestId('public-profile-header-stat-following'));
    expect(screen.getByTestId('follow-list')).toHaveAttribute('data-tab', 'following');
  });

  it('falls back for a member with nothing filled in: a generic name, a question-mark avatar, zero counts', () => {
    render(<PublicProfileHeader user={{ user_id: 'u2' }} />);
    expect(screen.getByTestId('public-profile-header-name')).toHaveTextContent('Duncit user');
    expect(screen.getByTestId('public-profile-header-avatar')).toHaveTextContent('?');
    expect(screen.getByTestId('public-profile-header-stat-followers')).toHaveTextContent('0');
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('shows only the place that is known', () => {
    const { unmount } = render(<PublicProfileHeader user={user({ zone: undefined })} />);
    expect(screen.getByText('Pune')).toBeInTheDocument();
    unmount();
    render(<PublicProfileHeader user={user({ city: undefined, bio: undefined })} />);
    expect(screen.getByText('Kothrud')).toBeInTheDocument();
  });
});

describe('PublicProfileBadges', () => {
  const badges = [
    { id: 'b1', awarded_at: '2026-05-01', awarded_reason: '4/10', badge: { id: 'x', title: 'Host Hero', image_url: 'https://img/b.png' } },
    { id: 'b2', awarded_at: null, awarded_reason: '', badge: { id: 'y', title: 'Explorer', image_url: '' } },
    { id: 'b3', awarded_at: null, awarded_reason: '', badge: null },
  ];

  it('renders nothing while loading with nothing yet, and when there are no badges', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: true });
    const { container, unmount } = render(<PublicProfileBadges userId="u1" />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    h.useQuery.mockReturnValue({ data: { userBadges: [] }, loading: false });
    const empty = render(<PublicProfileBadges userId="u1" />);
    expect(empty.container).toBeEmptyDOMElement();
  });

  it('renders nothing for a missing answer when not loading', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false });
    const { container } = render(<PublicProfileBadges userId="u1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for this member badges, shows each with its count, and opens the details with its award', () => {
    h.useQuery.mockReturnValue({ data: { userBadges: badges }, loading: false });
    render(<PublicProfileBadges userId="u1" />);
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { user_id: 'u1' } });
    expect(screen.getByTestId('public-profile-badges')).toHaveTextContent('(3)');
    expect(screen.getByTestId('public-profile-badges-badge-b1')).toHaveAccessibleName('View badge Host Hero');
    expect(screen.getByTestId('public-profile-badges-badge-b3')).toHaveAccessibleName('View badge');
    fireEvent.click(screen.getByTestId('public-profile-badges-badge-b1'));
    expect(screen.getByTestId('badge-sheet')).toHaveAttribute('data-title', 'Host Hero');
    expect(screen.getByTestId('badge-sheet')).toHaveAttribute('data-at', '2026-05-01');
    expect(screen.getByTestId('badge-sheet')).toHaveAttribute('data-reason', '4/10');
    fireEvent.click(screen.getByTestId('badge-close'));
    expect(screen.queryByTestId('badge-sheet')).not.toBeInTheDocument();
  });

  it('opens the details for a badge with no award date or no badge record', () => {
    h.useQuery.mockReturnValue({ data: { userBadges: badges }, loading: false });
    render(<PublicProfileBadges userId="u1" />);
    fireEvent.click(screen.getByTestId('public-profile-badges-badge-b3'));
    expect(screen.getByTestId('badge-sheet')).not.toHaveAttribute('data-title');
    fireEvent.click(screen.getByTestId('badge-close'));
    fireEvent.click(screen.getByTestId('public-profile-badges-badge-b2'));
    expect(screen.getByTestId('badge-sheet')).toHaveAttribute('data-title', 'Explorer');
  });

  it('keeps showing the badges during a refresh', () => {
    h.useQuery.mockReturnValue({ data: { userBadges: badges }, loading: true });
    render(<PublicProfileBadges userId="u1" />);
    expect(screen.getByTestId('public-profile-badges-grid')).toBeInTheDocument();
  });
});

describe('PublicProfileStories', () => {
  const stories = [
    { id: 's2', image_url: 'https://img/2.jpg', created_at: '2026-06-02T10:00:00.000Z' },
    { id: 's1', image_url: 'https://img/1.jpg', created_at: '2026-06-01T10:00:00.000Z' },
  ];

  it('opens without a profile photo', () => {
    render(<PublicProfileStories name="Asha" stories={stories} canReport />);
    expect(screen.getByTestId('public-profile-stories-item-s1')).toBeInTheDocument();
  });

  it('renders nothing without stories', () => {
    const { container } = render(<PublicProfileStories name="Asha" stories={[]} canReport />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws a ring per slide, oldest first, and opens the viewer on the tapped one, by click or keyboard', () => {
    render(<PublicProfileStories name="Asha" photo="https://img/a.jpg" stories={stories} canReport={false} />);
    const first = screen.getByTestId('public-profile-stories-item-s1');
    const second = screen.getByTestId('public-profile-stories-item-s2');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(first).toHaveAccessibleName(fallbackT('mweb.a11y.openStatusNumber', { vars: { number: 1 } }));
    fireEvent.click(second);
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-start', '1');
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-report', 'false');
    fireEvent.click(screen.getByTestId('viewer-close'));
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-start', '0');
    fireEvent.click(screen.getByTestId('viewer-close'));
    fireEvent.keyDown(first, { key: ' ' });
    expect(screen.getByTestId('viewer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('viewer-close'));
    fireEvent.keyDown(first, { key: 'Tab' });
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });
});

describe('ProfileActionsMenu and useProfileBlock', () => {
  const run = vi.fn();
  const menu = (profile: object = {}, loading = false, onChanged = vi.fn().mockResolvedValue(undefined)) => {
    h.useMutation.mockReturnValue([run, { loading }]);
    render(<ProfileActionsMenu profile={{ user_id: 'u1', full_name: 'Asha Rao', username: 'asha', blocked_by_viewer: false, ...profile } as never} onChanged={onChanged} />);
    return onChanged;
  };

  beforeEach(() => {
    run.mockReset().mockResolvedValue({});
    h.confirm.mockResolvedValue(true);
  });

  it('blocks after confirming, says so and re-reads the profile', async () => {
    const onChanged = menu();
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    fireEvent.click(await screen.findByTestId('public-profile-actions-block'));
    await waitFor(() => expect(run).toHaveBeenCalledWith({ variables: { user_id: 'u1' } }));
    expect(h.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith(expect.any(String), 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
    // Every feed that can hold their posts is dropped from the cache, to refetch without them.
    for (const fieldName of ['posts', 'stories', 'followingFeed', 'clubStories', 'post']) {
      expect(h.client.cache.evict).toHaveBeenCalledWith({ id: 'ROOT_QUERY', fieldName });
    }
    expect(h.client.cache.gc).toHaveBeenCalled();
  });

  it('offers Unblock for a blocked member, without a destructive confirm', async () => {
    menu({ blocked_by_viewer: true });
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    expect(await screen.findByTestId('public-profile-actions-block')).toHaveTextContent(fallbackT('contentReport.unblock'));
    fireEvent.click(screen.getByTestId('public-profile-actions-block'));
    await waitFor(() => expect(h.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: false })));
  });

  it('does nothing when the person backs out of the confirmation', async () => {
    h.confirm.mockResolvedValue(false);
    const onChanged = menu();
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    fireEvent.click(await screen.findByTestId('public-profile-actions-block'));
    await waitFor(() => expect(h.confirm).toHaveBeenCalled());
    expect(run).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows the server reason when blocking fails', async () => {
    run.mockRejectedValue(new Error('Blocked already'));
    menu();
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    fireEvent.click(await screen.findByTestId('public-profile-actions-block'));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Blocked already', 'error'));
  });

  it('opens the report dialog for the profile and closes it', async () => {
    menu();
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    fireEvent.click(await screen.findByTestId('public-profile-actions-report'));
    expect(screen.getByTestId('report')).toHaveAttribute('data-target', 'u1');
    expect(screen.getByTestId('report')).toHaveAttribute('data-kind', 'PROFILE');
    fireEvent.click(screen.getByTestId('report-close'));
    expect(screen.queryByTestId('report')).not.toBeInTheDocument();
  });

  it('turns the trigger into a disabled spinner while a block is going through', () => {
    menu({}, true);
    expect(screen.getByTestId('public-profile-actions-trigger')).toBeDisabled();
    expect(screen.getByTestId('public-profile-actions-busy')).toBeInTheDocument();
    expect(screen.getByTestId('public-profile-actions-trigger')).toHaveAccessibleName(fallbackT('contentReport.blocking'));
  });

  it('closes the menu without acting', async () => {
    menu();
    fireEvent.click(screen.getByTestId('public-profile-actions-trigger'));
    await screen.findByTestId('public-profile-actions-block');
    fireEvent.keyDown(screen.getByTestId('public-profile-actions-block'), { key: 'Escape' });
    expect(run).not.toHaveBeenCalled();
  });

  it('names the member by handle when there is no full name, and by nothing when there is neither', async () => {
    h.useMutation.mockReturnValue([run, { loading: false }]);
    const byHandle = renderHook(() => useProfileBlock({ user_id: 'u1', username: 'asha' }, vi.fn()));
    await act(async () => byHandle.result.current.toggle());
    expect(h.confirm.mock.calls[0][0].title).toContain('@asha');
    const nameless = renderHook(() => useProfileBlock({ user_id: 'u1' }, vi.fn()));
    await act(async () => nameless.result.current.toggle());
    expect(nameless.result.current.action).toBe('BLOCK');
  });
});

describe('PublicProfileOwnerActions', () => {
  it('sends the owner to account settings, and to a new pod idea', () => {
    inRouter(<PublicProfileOwnerActions />);
    fireEvent.click(screen.getByTestId('public-profile-owner-actions-edit'));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('opens settings and new idea', () => {
    const { unmount } = inRouter(<PublicProfileOwnerActions />);
    fireEvent.click(screen.getByTestId('public-profile-owner-actions-settings'));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
    unmount();
    inRouter(<PublicProfileOwnerActions />);
    fireEvent.click(screen.getByTestId('public-profile-owner-actions-new'));
    expect(screen.getByTestId('where')).toHaveTextContent('/pod-ideas');
  });
});

describe('PublicProfilePage', () => {
  const profile = (over: object = {}) => ({ user_id: 'u1', username: 'asha', full_name: 'Asha Rao', blocked_by_viewer: false, can_view_content: true, is_host: false, ...over });
  const page = (state: object) => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: vi.fn(), ...state });
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    return inRouter(<PublicProfilePage />, '/u/asha');
  };

  it('shows a skeleton while loading with nothing yet', () => {
    page({ loading: true });
    expect(screen.getByTestId('public-profile-page-loading')).toBeInTheDocument();
  });

  it('shows the error, and a not-found note for an unknown member', () => {
    const { unmount } = page({ error: new Error('Profile down') });
    expect(screen.getByTestId('public-profile-page-error')).toHaveTextContent('Profile down');
    unmount();
    page({ data: { publicUserProfile: null, me: null } });
    expect(screen.getByTestId('public-profile-page-not-found')).toHaveTextContent(fallbackT('mweb.publicProfile.userNotFound'));
  });

  it('shows another member with the follow actions, the block menu for a signed-in viewer, and their posts', () => {
    page({ data: { publicUserProfile: profile(), me: { user_id: 'me' } } });
    expect(h.meta).toHaveBeenCalledWith('Asha Rao');
    expect(screen.getByTestId('follow-actions')).toHaveAttribute('data-user', 'u1');
    expect(screen.getByTestId('public-profile-actions-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('posts')).toHaveAttribute('data-can-view', 'true');
    expect(screen.getByTestId('posts')).toHaveAttribute('data-owner', 'false');
    expect(screen.queryByTestId('public-profile-owner-actions')).not.toBeInTheDocument();
  });

  it('shows no block menu to a signed-out viewer', () => {
    page({ data: { publicUserProfile: profile(), me: null } });
    expect(screen.queryByTestId('public-profile-actions-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('posts')).toHaveAttribute('data-me', '');
  });

  it('shows the owner their own profile with owner actions, no follow button and no block menu', () => {
    page({ data: { publicUserProfile: profile(), me: { user_id: 'u1' } } });
    expect(screen.getByTestId('public-profile-owner-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('follow-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('public-profile-actions-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('posts')).toHaveAttribute('data-owner', 'true');
  });

  it('says the viewer blocked the member and drops the follow actions', () => {
    page({ data: { publicUserProfile: profile({ blocked_by_viewer: true }), me: { user_id: 'me' } } });
    expect(screen.getByTestId('public-profile-blocked')).toHaveTextContent(fallbackT('contentReport.blockedNotice'));
    expect(screen.queryByTestId('follow-actions')).not.toBeInTheDocument();
  });

  it('hides posts a private profile does not share, but always shows the owner theirs', () => {
    const { unmount } = page({ data: { publicUserProfile: profile({ can_view_content: false, is_host: true }), me: { user_id: 'me' } } });
    expect(screen.getByTestId('posts')).toHaveAttribute('data-can-view', 'false');
    expect(screen.getByTestId('posts')).toHaveAttribute('data-host', 'true');
    unmount();
    page({ data: { publicUserProfile: profile({ can_view_content: false }), me: { user_id: 'u1' } } });
    expect(screen.getByTestId('posts')).toHaveAttribute('data-can-view', 'true');
  });

  it('falls back to the handle for the posts name, and goes back from the header', () => {
    page({ data: { publicUserProfile: profile({ full_name: '' }), me: { user_id: 'me' } } });
    expect(screen.getByTestId('posts')).toHaveAttribute('data-name', 'asha');
    fireEvent.click(screen.getByTestId('public-profile-page-back'));
  });

  it('names the posts with an empty string when the member has neither a name nor a handle', () => {
    page({ data: { publicUserProfile: profile({ full_name: '', username: '' }), me: { user_id: 'me' } } });
    expect(screen.getByTestId('posts')).toHaveAttribute('data-name', '');
  });

  it('keeps a profile on screen through a refresh', () => {
    page({ loading: true, data: { publicUserProfile: profile(), me: { user_id: 'me' } } });
    expect(screen.getByTestId('public-profile-page')).toBeInTheDocument();
  });
});

