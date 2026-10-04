import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const navigateMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

// Lightweight stubs for the heavy child components so HomePage's own logic is
// what gets exercised. Each stub renders enough to assert on and, where useful,
// exposes an interaction (e.g. vibe onSelect) to drive HomePage state.
vi.mock('../HomeSkeleton', () => ({ default: () => <div>skeleton</div> }));
vi.mock('../HomeStatusRail', () => ({ default: () => <div>status-rail</div> }));
vi.mock('../HomeFeaturedPods', () => ({
  // The nearby total rides into the featured rail (its See-all card owns the
  // count now), and so does whether a chip/filter has narrowed the rails.
  default: ({ pods, totalCount, filtered }: any) => (
    <div>
      featured:{pods.length}/{totalCount}:{filtered ? 'filtered' : 'all'}
    </div>
  ),
}));
vi.mock('../HomeSearch', () => ({
  default: ({ disabled }: any) => <div>search:{disabled ? 'off' : 'on'}</div>,
}));
vi.mock('../ClubSection', () => ({
  default: ({ club }: any) => <div>club:{club.id}</div>,
}));
vi.mock('../OngoingPodsRail', () => ({
  default: ({ pods }: any) => <div>ongoing:{pods.length}</div>,
}));
vi.mock('../PreviousPodsRail', () => ({
  default: ({ pods }: any) => <div>previous:{pods.length}</div>,
}));
vi.mock('../../../components/ads/AdSlot', () => ({ default: () => <div>ad-slot</div> }));
vi.mock('../ClubRecommendationRow', () => ({ default: () => <div>club-recommendation</div> }));
vi.mock('../SomethingForYouRail', () => ({ default: () => <div>something-for-you</div> }));
vi.mock('../../../hooks/useSavedPodHearts', () => ({
  useSavedPodHearts: () => ({ signedIn: false, isSaved: vi.fn(), isSaving: vi.fn(), toggle: vi.fn() }),
}));
vi.mock('../FilterMenu', () => ({
  default: ({ disabled }: any) => <div>filter-menu:{disabled ? 'off' : 'on'}</div>,
}));
vi.mock('../HomeVibeChips', () => ({
  default: ({ onSelect, action }: any) => (
    <div>
      vibe-chips
      <button type="button" onClick={() => onSelect('missing-cat')}>
        select-missing
      </button>
      <button type="button" onClick={() => onSelect('chip-1')}>
        select-chip
      </button>
      {action}
    </div>
  ),
}));

const useHomeDataMock = vi.fn();
vi.mock('../useHomeData', () => ({ useHomeData: (args: any) => useHomeDataMock(args) }));

import HomePage from '../HomePage';

const baseReturn = () => ({
  data: { pods: [{ id: 'p1' }], clubs: [{ id: 'c1' }] },
  loading: false,
  error: undefined,
  branding: { home_all_vibe_icon_url: null, home_all_vibe_icon_layout: null },
  me: { user_id: 'u1' },
  isHost: false,
  clubs: [{ id: 'c1' }],
  featuredPods: [{ id: 'p1' }, { id: 'p2' }],
  podsByClub: new Map([['c1', [{ id: 'p1' }]]]),
  categoryChips: [{ id: 'chip-1' }],
  vibeCategories: [],
  followedClubs: [],
  hostPods: [],
  followedPosts: [],
  myStories: [],
  followedUsers: [],
  totalPods: 3,
  ongoingPods: [{ id: 'og1' }],
  previousPods: [{ id: 'pp1' }],
  hostNameOf: () => 'Host',
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage superCategorySlug="events" locationId="loc1" zoneName="zoneA" />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    useHomeDataMock.mockReset();
  });

  it('renders the loading skeleton while loading and no data yet', () => {
    useHomeDataMock.mockReturnValue({ ...baseReturn(), loading: true, data: undefined });
    renderPage();
    expect(screen.getByText('skeleton')).toBeInTheDocument();
  });

  it('renders an error alert when the query errors', () => {
    useHomeDataMock.mockReturnValue({
      ...baseReturn(),
      error: new Error('boom'),
    });
    renderPage();
    expect(screen.getByTestId('home-page-error')).toHaveTextContent('boom');
    expect(screen.queryByTestId('home-screen')).not.toBeInTheDocument();
  });

  it('renders the populated feed with clubs and hands the nearby total to the featured rail', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    expect(screen.getByText('Happening nearby')).toBeInTheDocument();
    expect(screen.getByText('club:c1')).toBeInTheDocument();
    expect(screen.getByText('featured:2/3:all')).toBeInTheDocument();
    expect(screen.getByText('club-recommendation')).toBeInTheDocument();
    expect(screen.getByText('something-for-you')).toBeInTheDocument();
    expect(screen.getByText('ongoing:1')).toBeInTheDocument();
    expect(screen.getByText('previous:1')).toBeInTheDocument();
    expect(screen.getByText('ad-slot')).toBeInTheDocument();
    // content present => search + filter enabled
    expect(screen.getByText('search:on')).toBeInTheDocument();
    expect(screen.getByText('filter-menu:on')).toBeInTheDocument();
  });

  it('tells the rails they are filtered once a vibe is picked', () => {
    // The full-list pages are unfiltered, so a filtered rail must drop its count.
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    fireEvent.click(screen.getByText('select-chip'));
    expect(screen.getByText('featured:2/3:filtered')).toBeInTheDocument();
    expect(useHomeDataMock).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 'chip-1' }));
  });

  it('shows the empty-clubs info alert and disables search/filter when no content', () => {
    useHomeDataMock.mockReturnValue({
      ...baseReturn(),
      data: { pods: [], clubs: [] },
      clubs: [],
      totalPods: 0,
    });
    renderPage();
    expect(screen.getByTestId('home-empty')).toHaveTextContent(/No pods here yet/);
    expect(screen.queryByText(/^club:/)).not.toBeInTheDocument();
    expect(screen.getByText('search:off')).toBeInTheDocument();
    expect(screen.getByText('filter-menu:off')).toBeInTheDocument();
  });

  it('navigates to happening-nearby via the header and See all button', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    // The title is a plain heading; See all is the one control that opens the list.
    fireEvent.click(screen.getByText('Happening nearby'));
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'See all' }));
    expect(navigateMock).toHaveBeenCalledWith('/happening-nearby');
  });

  it('invites a non-host into the become-a-host flow, with no Create pod FAB', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    expect(screen.queryByTestId('home-create-pod-fab')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
    expect(navigateMock).toHaveBeenCalledWith('/earn');
  });

  it('shows the Create pod FAB for hosts and navigates to create-pod', () => {
    useHomeDataMock.mockReturnValue({ ...baseReturn(), isHost: true });
    renderPage();
    const fab = screen.getByRole('button', { name: 'Create pod' });
    fireEvent.click(fab);
    expect(navigateMock).toHaveBeenCalledWith('/create-pod');

    navigateMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Create Pod' }));
    expect(navigateMock).toHaveBeenCalledWith('/create-pod');
  });

  it('resets an out-of-range selected category during render', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    // Select a category id that is not present in categoryChips -> HomePage's
    // guard clears it back to '' on the next render (no crash, still rendered).
    fireEvent.click(screen.getByText('select-missing'));
    expect(screen.getByText('Happening nearby')).toBeInTheDocument();
    expect(useHomeDataMock).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '' }));
    expect(screen.getByText('featured:2/3:all')).toBeInTheDocument();
  });
});
