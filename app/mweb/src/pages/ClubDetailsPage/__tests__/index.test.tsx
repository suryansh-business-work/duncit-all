import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClubDetailsPage from '../index';
import { CLUB_BY_SLUG, CLUB_DETAILS_RELATED, CATEGORY_TREE } from '../clubDetailsQueries';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  toggleFollow: vi.fn(),
  notify: vi.fn(),
  isFollowing: vi.fn(() => false),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => h.navigate };
});

vi.mock('../../../components/notify', () => ({ notify: h.notify }));

vi.mock('../../../hooks/useFollowedClubs', () => ({
  useFollowedClubs: () => ({ isFollowing: h.isFollowing, toggle: h.toggleFollow }),
}));

vi.mock('../../../hooks/usePricing', () => ({
  usePricing: () => ({ format: (n: number) => `₹${n}` }),
}));

// Lightweight child stubs that surface the props/callbacks we exercise.
vi.mock('../../club-details-page/ClubDetailsSkeleton', () => ({
  default: () => <div>skeleton</div>,
}));
vi.mock('../../club-details-page/ClubHero', () => ({
  default: (p: any) => (
    <div>
      <div>hero:{p.title}</div>
      <div>saved:{String(p.saved)}</div>
      <div>following:{String(p.following)}</div>
      <button onClick={p.onBack}>back</button>
      <button onClick={p.onToggleFollow}>hero-follow</button>
      <button onClick={p.onToggleSave}>hero-save</button>
      <button onClick={p.onShare}>hero-share</button>
    </div>
  ),
}));
vi.mock('../../club-details-page/ClubSummaryHeader', () => ({
  default: (p: any) => (
    <div>summary:{p.podCount}/{p.venueCount}/{p.followersCount}/{p.categoryCrumbs.join('>')}</div>
  ),
}));
vi.mock('../../club-details-page/ClubStoriesSection', () => ({ default: () => <div>stories</div> }));
vi.mock('../../club-details-page/ClubSocialLinks', () => ({ default: () => <div>social</div> }));
vi.mock('../../club-details-page/ClubTotalMembersSection', () => ({
  default: (p: any) => <div>total:{p.count}</div>,
}));
vi.mock('../../club-details-page/ClubMembersSection', () => ({
  default: (p: any) => <div>members:{p.memberIds.join(',')}</div>,
}));
vi.mock('../../club-details-page/ClubFriendsSection', () => ({
  default: (p: any) => <div>friends:{p.friendIds.join(',')}</div>,
}));
vi.mock('../../club-details-page/ClubRatingSection', () => ({
  default: (p: any) => <div>rating:{p.rating}/{p.ratingsCount}</div>,
}));
vi.mock('../../club-details-page/ClubMeetupVenuesSection', () => ({
  default: (p: any) => <div>venues:{p.venues.length}</div>,
}));
vi.mock('../../club-details-page/ClubSegments', () => ({
  default: (p: any) => (
    <button onClick={() => p.onOpenPod('pod-doc-1')}>open-pod {p.priceFormat(5)}</button>
  ),
}));

const club = {
  id: 'club-doc-1',
  club_id: 'CLB1',
  club_name: 'Chess Club',
  club_description: 'We love chess',
  club_feature_images_and_videos: [{ url: 'https://img/1.jpg', type: 'image' }],
  club_moments: [],
  who_we_are: null,
  what_we_do: null,
  perks: null,
  values: null,
  faqs: [],
  club_whats_app_community_link: null,
  club_whats_app_announcement_link: null,
  club_whats_app_group_link: 'https://wa/group',
  matched_venues: [{ id: 'v1', venue_name: 'Hall', address_line1: null, address_line2: null, locality: null, city: null, state: null, country: null, postal_code: null, lat: null, lng: null }],
  followers_count: 42,
  rating: 4.5,
  ratings_count: 10,
  hosts: [],
  category_id: 'cat-sub',
  super_category_id: 'cat-super',
};

const related = {
  me: { user_id: 'me', following_user_ids: ['u1'] },
  clubPods: [
    {
      id: 'pod-doc-1',
      pod_id: 'POD1',
      pod_title: 'Blitz Night',
      pod_date_time: '2026-08-01T10:00:00Z',
      pod_end_date_time: '2026-08-01T12:00:00Z',
      pod_type: 'FREE',
      pod_amount: 0,
      pod_attendees: ['u1', 'u2'],
      no_of_spots: 8,
      place_label: 'Hall',
      place_detail: 'Main Hall',
      club_slug: 'chess',
      pod_images_and_videos: [],
    },
  ],
};

const categories = [
  { id: 'cat-super', name: 'Games', level: 'SUPER', parent_id: null },
  { id: 'cat-sub', name: 'Chess', level: 'SUB', parent_id: 'cat-super' },
];

const catMock = { request: { query: CATEGORY_TREE }, result: { data: { categories } } };

function slugMock(data: any) {
  return { request: { query: CLUB_BY_SLUG, variables: { slug: 'chess' } }, result: { data } };
}
function relatedMock(overrides: Partial<{ error: boolean }> = {}) {
  const base = { request: { query: CLUB_DETAILS_RELATED, variables: { id: 'club-doc-1' } } };
  return overrides.error
    ? { ...base, error: new Error('related boom') }
    : { ...base, result: { data: related } };
}

function renderPage(mocks: any[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={['/club/chess']}>
        <Routes>
          <Route path="/club/:clubSlug" element={<ClubDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isFollowing.mockReturnValue(false);
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ClubDetailsPage', () => {
  it('shows the skeleton while loading', () => {
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    expect(screen.getByText('skeleton')).toBeInTheDocument();
  });

  it('renders the populated club with derived sections', async () => {
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    expect(await screen.findByText('hero:Chess Club')).toBeInTheDocument();
    // pod count / venue count / followers / breadcrumb
    expect(screen.getByText('summary:1/1/42/Games>Chess')).toBeInTheDocument();
    // About section rendered from description
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('We love chess')).toBeInTheDocument();
    // members = unique attendees, friends = intersect with following_user_ids
    expect(screen.getByText('members:u1,u2')).toBeInTheDocument();
    expect(screen.getByText('friends:u1')).toBeInTheDocument();
    expect(screen.getByText('total:42')).toBeInTheDocument();
    expect(screen.getByText('rating:4.5/10')).toBeInTheDocument();
    expect(screen.getByText('venues:1')).toBeInTheDocument();
    // priceFormat passed through
    expect(screen.getByText(/open-pod/)).toBeInTheDocument();
  });

  it('navigates back and opens a pod', async () => {
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('back'));
    expect(h.navigate).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByText(/open-pod/));
    expect(h.navigate).toHaveBeenCalledWith('/club/CLB1/pod/POD1');
  });

  it('toggles follow and notifies on success then error', async () => {
    h.toggleFollow.mockResolvedValueOnce(true);
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('hero-follow'));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Following Chess Club', 'success'));

    h.toggleFollow.mockRejectedValueOnce(new Error('nope'));
    fireEvent.click(screen.getByText('hero-follow'));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('nope', 'error'));
  });

  it('unfollow branch produces the Unfollowed message', async () => {
    h.toggleFollow.mockResolvedValueOnce(false);
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('hero-follow'));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Unfollowed Chess Club', 'success'));
  });

  it('saves the club through localStorage', async () => {
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('hero-save'));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('duncit_saved_clubs') || '[]')).toContain('club-doc-1'),
    );
    expect(h.notify).toHaveBeenCalledWith('Saved', 'success');
  });

  it('shares via navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'share', { value: share, configurable: true });
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('hero-share'));
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Chess Club', url: expect.stringContaining('/club/CLB1') }),
      ),
    );
    delete (globalThis.navigator as any).share;
  });

  it('falls back to clipboard when share is unavailable', async () => {
    delete (globalThis.navigator as any).share;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage([slugMock({ clubBySlug: club }), relatedMock(), catMock]);
    await screen.findByText('hero:Chess Club');
    fireEvent.click(screen.getByText('hero-share'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(h.notify).toHaveBeenCalledWith('Link copied', 'success');
  });

  it('renders an error alert when the related query fails', async () => {
    renderPage([slugMock({ clubBySlug: club }), relatedMock({ error: true }), catMock]);
    expect(await screen.findByText('related boom')).toBeInTheDocument();
  });

  it('renders a not-found warning when the club is missing', async () => {
    renderPage([slugMock({ clubBySlug: null }), catMock]);
    expect(await screen.findByText('Club not found.')).toBeInTheDocument();
  });
});
