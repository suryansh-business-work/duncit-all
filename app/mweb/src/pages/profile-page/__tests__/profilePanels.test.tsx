import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import HostPodsSection from '../HostPodsSection';
import UserHostPanel from '../UserHostPanel';
import UserVenuePanel from '../UserVenuePanel';
import ProfileAboutSection from '../ProfileAboutSection';
import ProfilePostsGrid from '../ProfilePostsGrid';
import ProfileHandleLink from '../ProfileHandleLink';
import ProfilePage from '../ProfilePage';
import { fallbackT } from '../../../i18n/fallback';
import { logs } from '@duncit/logs';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  success: vi.fn(),
  tabs: { value: 'posts' } as { value: string },
  raf: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: vi.fn() }));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  formatDate: (d: string) => `D:${d}`,
  formatDateTime: (d: string) => (d ? `DT:${d}` : ''),
}));
vi.mock('../ProfileAboutEditForm', () => ({
  default: (p: { bio: string; links: unknown[]; onCancel: () => void; onSaved: () => void }) => (
    <div data-testid="edit-form" data-bio={p.bio} data-links={p.links.length}>
      <button data-testid="edit-cancel" onClick={p.onCancel} />
      <button data-testid="edit-saved" onClick={p.onSaved} />
    </div>
  ),
}));
vi.mock('../PostDialog', () => ({
  default: (p: { postId: string | null; meId: string; onClose: () => void; onDeleted: () => void }) => (
    <div data-testid="post-dialog" data-post={p.postId ?? ''} data-me={p.meId}>
      <button data-testid="post-close" onClick={p.onClose} />
      <button data-testid="post-deleted" onClick={p.onDeleted} />
    </div>
  ),
}));
vi.mock('../UploadDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) => (
    <div data-testid="upload-dialog" data-open={String(p.open)}>
      <button data-testid="upload-close" onClick={p.onClose} />
      <button data-testid="upload-ok" onClick={() => p.onSuccess('Posted')} />
      <button data-testid="upload-err" onClick={() => p.onError('Too big')} />
    </div>
  ),
}));
vi.mock('../ProfileAccordions', () => ({
  default: (p: { autoSendEmailOtp: boolean; onSaved: () => void }) => (
    <div data-testid="accordions" data-otp={String(p.autoSendEmailOtp)}>
      <button data-testid="acc-saved" onClick={p.onSaved} />
    </div>
  ),
}));
vi.mock('../ProfileHeader', () => ({
  default: (p: { postsCount: number; onNewPost: () => void; onSettings: () => void; onChanged: () => void }) => (
    <div data-testid="header" data-posts={p.postsCount}>
      <button data-testid="hdr-new" onClick={p.onNewPost} />
      <button data-testid="hdr-settings" onClick={p.onSettings} />
      <button data-testid="hdr-changed" onClick={p.onChanged} />
    </div>
  ),
}));
vi.mock('../ProfileBadgesStrip', () => ({ default: () => <div data-testid="badges" /> }));
vi.mock('../../../components/profile-tabs', () => ({
  useProfileTabs: (isHost: boolean) => ({ ...h.tabs, isHost }),
  ProfileTabs: () => <div data-testid="tabs" />,
  ProfilePodsPanel: (p: { userId: string; kind: string }) => <div data-testid={`pods-${p.kind}`} data-user={p.userId} />,
}));

const Where = () => {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
};
const withRouter = (ui: React.ReactNode, entry = '/') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.tabs.value = 'posts';
});

describe('HostPodsSection', () => {
  it('shows the loader instead of the list while loading, with the pod count', () => {
    withRouter(<HostPodsSection pods={[]} loading />);
    expect(screen.getByTestId('host-pods-section-loading')).toBeInTheDocument();
    expect(screen.getByTestId('host-pods-section-count')).toHaveTextContent('0');
    expect(screen.queryByTestId('host-pods-section-empty')).not.toBeInTheDocument();
  });

  it('says there are no pods yet', () => {
    withRouter(<HostPodsSection pods={[]} loading={false} />);
    expect(screen.getByTestId('host-pods-section-empty')).toHaveTextContent(fallbackT('mweb.profile.noPodsYet'));
  });

  it('lists pods, opens one on click and ignores a pod with no club or pod id', () => {
    const pods = [
      { id: 'a', pod_id: 'P1', club_slug: 'chess', pod_title: 'Chess', pod_date_time: '2026-06-01', pod_images_and_videos: [{ url: 'v.mp4', type: 'VIDEO' }, { url: 'i.png', type: 'IMAGE' }] },
      { id: 'b', pod_id: '', club_slug: 'chess', pod_title: 'Draft', pod_date_time: '', pod_images_and_videos: [{ url: 'only.mp4', type: 'VIDEO' }] },
      { id: 'c', pod_id: 'P3', club_slug: '', pod_title: 'NoImg', pod_date_time: '2026-06-02', pod_images_and_videos: null },
      { id: 'd', pod_id: 'P4', club_slug: 'x', pod_title: 'Null media', pod_date_time: '2026-06-03', pod_images_and_videos: [null] },
    ];
    withRouter(<HostPodsSection pods={pods} loading={false} />);
    expect(screen.getByTestId('host-pods-section-count')).toHaveTextContent('4');
    expect(screen.getByTestId('host-pods-section-pod-a')).toHaveTextContent('DT:2026-06-01');
    expect(screen.getByTestId('host-pods-section-pod-b')).not.toHaveTextContent('DT:');
    expect(screen.getByTestId('host-pods-section-pod-a').querySelector('img')).toHaveAttribute('src', 'i.png');
    expect(screen.getByTestId('host-pods-section-pod-b').querySelector('img')).toHaveAttribute('src', 'only.mp4');
    expect(screen.getByTestId('host-pods-section-pod-c').querySelector('img')).toBeNull();
    fireEvent.click(screen.getByTestId('host-pods-section-pod-b'));
    fireEvent.click(screen.getByTestId('host-pods-section-pod-c'));
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('host-pods-section-pod-a'));
    expect(screen.getByTestId('where')).toHaveTextContent('/club/chess/pod/P1');
  });
});

describe('UserHostPanel', () => {
  const host = (over: object = {}) => ({ id: 'h1', user_id: 'u9', status: 'PENDING', step_completed: 2, reviewer_notes: '', submitted_at: '2026-05-01', approved_at: null, ...over });
  const setup = (main: object, pods: object = { data: undefined, loading: false }) => {
    h.useQuery.mockImplementation((_doc: unknown, opts: { variables?: unknown }) => (opts?.variables ? pods : main));
    return withRouter(<UserHostPanel />);
  };

  it('shows a loader before the first answer, and the error when the read fails', () => {
    setup({ data: undefined, loading: true, error: undefined });
    expect(screen.getByTestId('user-host-panel-loading')).toBeInTheDocument();
  });

  it('shows the read error', () => {
    setup({ data: undefined, loading: false, error: new Error('Host down') });
    expect(screen.getByTestId('user-host-panel-error')).toHaveTextContent('Host down');
  });

  it('invites a non-host to become one', () => {
    setup({ data: { myHost: null, me: { user_id: 'u1', roles: [] } }, loading: false });
    expect(screen.getByTestId('user-host-panel-empty')).toHaveTextContent('You have not started a host profile yet.');
    fireEvent.click(screen.getByTestId('user-host-panel-start'));
    expect(screen.getByTestId('where')).toHaveTextContent('/become-host');
  });

  it('asks a host without a profile to complete it, and tolerates missing roles', () => {
    setup({ data: { myHost: null, me: { user_id: 'u1', roles: ['HOST'] } }, loading: false });
    expect(screen.getByTestId('user-host-panel-start')).toHaveTextContent('Complete host profile');
    fireEvent.click(screen.getByTestId('user-host-panel-start'));
    expect(screen.getByTestId('where')).toHaveTextContent('/become-host');
  });

  it('treats a missing me as not a host', () => {
    setup({ data: { myHost: null, me: null }, loading: false });
    expect(screen.getByTestId('user-host-panel-start')).toHaveTextContent('Become a Host');
  });

  it('shows a pending application with its progress, submit date and resume step, without pods', () => {
    setup({ data: { myHost: host({ reviewer_notes: 'Add ID' }), me: { user_id: 'u1', roles: ['HOST'] } }, loading: false });
    expect(screen.getByTestId('user-host-panel-status')).toHaveTextContent('PENDING');
    expect(screen.getByText('Submitted D:2026-05-01')).toBeInTheDocument();
    expect(screen.getByTestId('user-host-panel-notes')).toHaveTextContent('Add ID');
    expect(screen.getByTestId('user-host-panel-resume')).toHaveTextContent('Resume - step 3 of 4');
    expect(screen.queryByTestId('host-pods-section')).not.toBeInTheDocument();
    const podsCall = h.useQuery.mock.calls.find((c) => c[1]?.variables);
    expect(podsCall?.[1].skip).toBe(true);
  });

  it('caps resume at step 4, has no date line and no notes when neither exists, and defaults an absent step to 1', () => {
    setup({ data: { myHost: host({ step_completed: 9, submitted_at: null }), me: { user_id: 'u1', roles: [] } }, loading: false });
    expect(screen.getByTestId('user-host-panel-resume')).toHaveTextContent('Resume - step 4 of 4');
    expect(screen.queryByTestId('user-host-panel-notes')).not.toBeInTheDocument();
    expect(screen.queryByText(/Submitted|Approved/)).not.toBeInTheDocument();
  });

  it('shows 1 of 4 when no step has been completed', () => {
    setup({ data: { myHost: host({ step_completed: null }), me: { user_id: 'u1', roles: [] } }, loading: false });
    expect(screen.getByTestId('user-host-panel-resume')).toHaveTextContent('Resume - step 1 of 4');
  });

  it('shows an approved host with approval date, update button and their pods', () => {
    setup(
      { data: { myHost: host({ status: 'APPROVED', approved_at: '2026-05-09' }), me: { user_id: 'u1', roles: ['HOST'] } }, loading: false },
      { data: { pods: [{ id: 'a', pod_id: 'P', club_slug: 'c', pod_title: 'Run', pod_date_time: '2026-06-01', pod_images_and_videos: [] }] }, loading: false }
    );
    expect(screen.getByText('Approved D:2026-05-09')).toBeInTheDocument();
    expect(screen.getByTestId('user-host-panel-resume')).toHaveTextContent('Update host profile');
    expect(screen.getByTestId('host-pods-section-pod-a')).toBeInTheDocument();
    const podsCall = h.useQuery.mock.calls.find((c) => c[1]?.variables);
    expect(podsCall?.[1].variables).toEqual({ host_user_id: 'u1' });
    expect(podsCall?.[1].skip).toBe(false);
  });

  it('falls back to the host record user id for the pods read, and shows the pods loader while loading first time', () => {
    setup(
      { data: { myHost: host({ status: 'APPROVED', approved_at: '2026-05-09' }), me: null }, loading: false },
      { data: undefined, loading: true }
    );
    expect(screen.getByTestId('host-pods-section-loading')).toBeInTheDocument();
    expect(h.useQuery.mock.calls.find((c) => c[1]?.variables)?.[1].variables).toEqual({ host_user_id: 'u9' });
  });

  it('shows no pods list when the pods answer is missing', () => {
    setup(
      { data: { myHost: host({ status: 'APPROVED', approved_at: '2026-05-09' }), me: { user_id: 'u1', roles: [] } }, loading: false },
      { data: { pods: null }, loading: false }
    );
    expect(screen.getByTestId('host-pods-section-empty')).toBeInTheDocument();
  });
});

describe('UserVenuePanel', () => {
  const venue = (over: object = {}) => ({ id: 'v1', venue_name: 'Court One', status: 'PENDING', step_completed: 1, reviewer_notes: '', submitted_at: '2026-05-01', approved_at: null, ...over });
  const setup = (main: object, props: { venueId?: string | null } = {}) => {
    h.useQuery.mockReturnValue(main);
    return withRouter(<UserVenuePanel {...props} />);
  };

  it('shows a loader, and the read error', () => {
    setup({ data: undefined, loading: true, error: undefined });
    expect(screen.getByTestId('user-venue-panel-loading')).toBeInTheDocument();
  });

  it('shows the error', () => {
    setup({ data: undefined, loading: false, error: new Error('Venue down') });
    expect(screen.getByTestId('user-venue-panel-error')).toHaveTextContent('Venue down');
  });

  it('invites registering a venue and goes to the form', () => {
    setup({ data: { myVenue: null }, loading: false });
    fireEvent.click(screen.getByTestId('user-venue-panel-start'));
    expect(screen.getByTestId('where')).toHaveTextContent('/register-venue');
  });

  it('asks the server for the selected venue, or null on the profile page', () => {
    setup({ data: { myVenue: null }, loading: false }, { venueId: 'v7' });
    expect(h.useQuery.mock.calls[0][1].variables).toEqual({ venue_id: 'v7' });
    h.useQuery.mockClear();
    setup({ data: { myVenue: null }, loading: false });
    expect(h.useQuery.mock.calls[0][1].variables).toEqual({ venue_id: null });
  });

  it('shows a pending application with its name, dates, notes and resume step', () => {
    setup({ data: { myVenue: venue({ reviewer_notes: 'Fix photos' }) }, loading: false });
    expect(screen.getByText('Court One')).toBeInTheDocument();
    expect(screen.getByText('Submitted D:2026-05-01')).toBeInTheDocument();
    expect(screen.getByTestId('user-venue-panel-notes')).toHaveTextContent('Fix photos');
    expect(screen.getByTestId('user-venue-panel-resume')).toHaveTextContent('Resume - step 2 of 4');
  });

  it('names an unnamed application, hides the date and notes when absent and defaults the step', () => {
    setup({ data: { myVenue: venue({ venue_name: '', submitted_at: null, step_completed: undefined }) }, loading: false });
    expect(screen.getByText('Venue application')).toBeInTheDocument();
    expect(screen.queryByText(/Submitted|Approved/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-venue-panel-notes')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-venue-panel-resume')).toHaveTextContent('Resume - step 1 of 4');
  });

  it('shows an approved venue with the approval date and an update button', () => {
    setup({ data: { myVenue: venue({ status: 'APPROVED', approved_at: '2026-05-09', step_completed: 7 }) }, loading: false });
    expect(screen.getByText('Approved D:2026-05-09')).toBeInTheDocument();
    expect(screen.getByTestId('user-venue-panel-resume')).toHaveTextContent('Update venue profile');
    fireEvent.click(screen.getByTestId('user-venue-panel-resume'));
    expect(screen.getByTestId('where')).toHaveTextContent('/register-venue');
  });
});

describe('ProfileAboutSection', () => {
  it('shows the bio and links, and opens a safe external link for each', () => {
    const me = { bio: 'Hello\nthere', profile_links: [{ label: 'Site', url: 'https://a.example' }] };
    render(<ProfileAboutSection me={me} onSaved={vi.fn()} />);
    expect(screen.getByTestId('profile-about-section-bio')).toHaveTextContent('Hello');
    const link = screen.getByTestId('profile-about-section-link-Site-https://a.example');
    expect(link).toHaveAttribute('href', 'https://a.example');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByTestId('profile-about-section-saved')).not.toBeInTheDocument();
  });

  it('prompts for a description when there is none and shows no links block', () => {
    render(<ProfileAboutSection me={{ bio: null }} onSaved={vi.fn()} />);
    expect(screen.getByTestId('profile-about-section-bio')).toHaveTextContent('Add a short description');
    expect(screen.queryByTestId('profile-about-section-links')).not.toBeInTheDocument();
  });

  it('edits, passes the current values to the form, cancels back to the view', () => {
    render(<ProfileAboutSection me={{ bio: 'Hi', profile_links: [{ label: 'a', url: 'u' }] }} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByTestId('profile-about-section-edit'));
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-bio', 'Hi');
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-links', '1');
    fireEvent.click(screen.getByTestId('edit-cancel'));
    expect(screen.getByTestId('profile-about-section')).toBeInTheDocument();
  });

  it('gives the form an empty bio when none is stored, and confirms a save which can be dismissed', () => {
    const onSaved = vi.fn();
    render(<ProfileAboutSection me={{ bio: null }} onSaved={onSaved} />);
    fireEvent.click(screen.getByTestId('profile-about-section-edit'));
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-bio', '');
    fireEvent.click(screen.getByTestId('edit-saved'));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('profile-about-section-saved')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    return waitFor(() => expect(screen.queryByTestId('profile-about-section-saved')).not.toBeInTheDocument());
  });
});

describe('ProfilePostsGrid', () => {
  it('invites sharing a first photo when there are no posts', () => {
    const onNewPost = vi.fn();
    render(<ProfilePostsGrid posts={[]} onOpenPost={vi.fn()} onNewPost={onNewPost} />);
    expect(screen.getByTestId('profile-posts-grid-empty')).toHaveTextContent(fallbackT('mweb.profile.sharePhotos'));
    fireEvent.click(screen.getByTestId('profile-posts-grid-share-first'));
    expect(onNewPost).toHaveBeenCalledTimes(1);
  });

  it('lists posts with counts, alt text from the caption (or a plain word) and opens one', () => {
    const onOpenPost = vi.fn();
    render(
      <ProfilePostsGrid
        posts={[
          { id: 'p1', image_url: 'a.png', caption: 'Sunrise', likes_count: 3, comments_count: 1 },
          { id: 'p2', image_url: 'b.png', caption: '', likes_count: 0, comments_count: 0 },
        ]}
        onOpenPost={onOpenPost}
        onNewPost={vi.fn()}
      />
    );
    expect(screen.getByTestId('profile-posts-grid-post-p1-likes')).toHaveTextContent('3');
    expect(screen.getByTestId('profile-posts-grid-post-p1-comments')).toHaveTextContent('1');
    expect(screen.getByAltText('Sunrise')).toHaveAttribute('src', 'a.png');
    expect(screen.getByAltText('post')).toHaveAttribute('src', 'b.png');
    fireEvent.click(screen.getByTestId('profile-posts-grid-post-p2'));
    expect(onOpenPost).toHaveBeenCalledWith('p2');
  });
});

describe('ProfileHandleLink', () => {
  it('shows the fallback line when the account has no handle', () => {
    render(<ProfileHandleLink username={null} fallback="Member" />);
    expect(screen.getByTestId('profile-handle-link')).toHaveTextContent('Member');
    expect(screen.getByTestId('profile-handle-link').tagName).not.toBe('BUTTON');
  });

  it('copies the profile link and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ProfileHandleLink username="asha" fallback="Member" />);
    const button = screen.getByTestId('profile-handle-link');
    expect(button).toHaveTextContent('@asha');
    fireEvent.click(button);
    await waitFor(() => expect(h.success).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('asha');
    expect(writeText.mock.calls[0][0]).toContain(globalThis.window.location.origin);
  });

  it('logs a warning, not a false confirmation, when the clipboard refuses', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ProfileHandleLink username="asha" fallback="Member" />);
    fireEvent.click(screen.getByTestId('profile-handle-link'));
    await waitFor(() => expect(warn).toHaveBeenCalledWith('ProfileHandleLink', 'copyLink', expect.anything()));
    expect(h.success).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('ProfilePage', () => {
  const me = { user_id: 'u1', roles: [] as string[], is_email_verified: false };
  const ok = (over: object = {}, refetch = vi.fn()) => ({ data: { me, myPosts: [{ id: 'p1' }] , ...over }, loading: false, error: undefined, refetch });
  const page = (result: object, entry = '/') => {
    h.useQuery.mockReturnValue(result);
    return withRouter(<ProfilePage />, entry);
  };

  it('shows a loader before the first answer', () => {
    page({ data: undefined, loading: true, error: undefined, refetch: vi.fn() });
    expect(screen.getByTestId('profile-page-loading')).toBeInTheDocument();
  });

  it('shows the read error, or a plain sentence when there is no account and no message', () => {
    page({ data: undefined, loading: false, error: new Error('Profile down'), refetch: vi.fn() });
    expect(screen.getByTestId('profile-page-error')).toHaveTextContent('Profile down');
  });

  it('says it could not load when there is no profile and no error', () => {
    page({ data: { me: null }, loading: false, error: undefined, refetch: vi.fn() });
    expect(screen.getByTestId('profile-page-error')).toHaveTextContent('Unable to load profile');
  });

  it('shows the posts tab with the header counting posts, and opens, closes and deletes a post', () => {
    const refetch = vi.fn();
    page(ok({}, refetch));
    expect(screen.getByTestId('header')).toHaveAttribute('data-posts', '1');
    expect(screen.getByTestId('profile-posts-grid')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('profile-posts-grid-post-p1'));
    expect(screen.getByTestId('post-dialog')).toHaveAttribute('data-post', 'p1');
    expect(screen.getByTestId('post-dialog')).toHaveAttribute('data-me', 'u1');
    fireEvent.click(screen.getByTestId('post-close'));
    expect(screen.getByTestId('post-dialog')).toHaveAttribute('data-post', '');
    fireEvent.click(screen.getByTestId('profile-posts-grid-post-p1'));
    fireEvent.click(screen.getByTestId('post-deleted'));
    expect(screen.getByTestId('post-dialog')).toHaveAttribute('data-post', '');
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('treats an absent post list as empty', () => {
    page({ data: { me, myPosts: null }, loading: false, error: undefined, refetch: vi.fn() });
    expect(screen.getByTestId('profile-posts-grid-empty')).toBeInTheDocument();
  });

  it('opens the upload dialog from the header or the empty grid, and toasts a result then refreshes', async () => {
    const refetch = vi.fn();
    page({ data: { me, myPosts: [] }, loading: false, error: undefined, refetch });
    expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByTestId('profile-posts-grid-share-first'));
    expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'true');
    fireEvent.click(screen.getByTestId('upload-close'));
    expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByTestId('hdr-new'));
    fireEvent.click(screen.getByTestId('upload-ok'));
    expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'false');
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Posted')).toBeInTheDocument();
  });

  it('toasts an upload error without refreshing or closing the dialog', async () => {
    const refetch = vi.fn();
    page({ data: { me, myPosts: [] }, loading: false, error: undefined, refetch });
    fireEvent.click(screen.getByTestId('hdr-new'));
    fireEvent.click(screen.getByTestId('upload-err'));
    expect(await screen.findByText('Too big')).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'true');
  });

  it('opens the upload dialog when the link asks for a new post, and drops the flag from the address', async () => {
    page(ok(), '/?newPost=1&x=2');
    await waitFor(() => expect(screen.getByTestId('upload-dialog')).toHaveAttribute('data-open', 'true'));
  });

  it('refreshes after settings or header changes and goes to the account page', () => {
    const refetch = vi.fn();
    page(ok({}, refetch));
    fireEvent.click(screen.getByTestId('acc-saved'));
    fireEvent.click(screen.getByTestId('hdr-changed'));
    expect(refetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('hdr-settings'));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('shows the joined and hosted pod lists, hosted only for a host', () => {
    h.tabs.value = 'joined';
    const { unmount } = page(ok());
    expect(screen.getByTestId('pods-joined')).toHaveAttribute('data-user', 'u1');
    unmount();
    h.tabs.value = 'hosted';
    const notHost = page(ok());
    expect(screen.queryByTestId('pods-hosted')).not.toBeInTheDocument();
    notHost.unmount();
    page(ok({ me: { ...me, roles: ['HOST'] } }));
    expect(screen.getByTestId('pods-hosted')).toBeInTheDocument();
  });

  it('scrolls to the email block and asks the accordions to send the code when verifying is requested', () => {
    const target = document.createElement('div');
    target.id = 'email-verification';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    page(ok(), '/?verifyEmail=1');
    expect(screen.getByTestId('accordions')).toHaveAttribute('data-otp', 'true');
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    raf.mockRestore();
    target.remove();
  });

  it('does not fail to scroll when the email block is not on the page', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    page(ok(), '/?verifyEmail=1');
    expect(screen.getByTestId('accordions')).toHaveAttribute('data-otp', 'true');
    raf.mockRestore();
  });

  it('keeps the page up while a refresh is in flight', () => {
    page({ ...ok(), loading: true });
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
  });
});
