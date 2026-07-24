import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// Lightweight stubs for the heavy child components so HomePage's own logic is
// what gets exercised. Each stub renders enough to assert on and, where useful,
// exposes an interaction (e.g. vibe onSelect) to drive HomePage state.
vi.mock('../HomeSkeleton', () => ({ default: () => <div>skeleton</div> }));
vi.mock('../HomeStatusRail', () => ({ default: () => <div>status-rail</div> }));
vi.mock('../HomeFeaturedPods', () => ({
  default: ({ pods }: any) => <div>featured:{pods.length}</div>,
}));
vi.mock('../HomeSearch', () => ({
  default: ({ disabled }: any) => <div>search:{disabled ? 'off' : 'on'}</div>,
}));
vi.mock('../ClubSection', () => ({
  default: ({ club }: any) => <div>club:{club.id}</div>,
}));
vi.mock('../PreviousPodsRail', () => ({
  default: ({ pods }: any) => <div>previous:{pods.length}</div>,
}));
vi.mock('../../../components/ads/AdSlot', () => ({ default: () => <div>ad-slot</div> }));
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
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders the populated feed with clubs and the pods-nearby label', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    expect(screen.getByText('Happening nearby')).toBeInTheDocument();
    expect(screen.getByText('3 pods nearby')).toBeInTheDocument();
    expect(screen.getByText('club:c1')).toBeInTheDocument();
    expect(screen.getByText('featured:2')).toBeInTheDocument();
    expect(screen.getByText('previous:1')).toBeInTheDocument();
    expect(screen.getByText('ad-slot')).toBeInTheDocument();
    // content present => search + filter enabled
    expect(screen.getByText('search:on')).toBeInTheDocument();
    expect(screen.getByText('filter-menu:on')).toBeInTheDocument();
  });

  it('uses singular "pod" label when exactly one pod nearby', () => {
    useHomeDataMock.mockReturnValue({ ...baseReturn(), totalPods: 1 });
    renderPage();
    expect(screen.getByText('1 pod nearby')).toBeInTheDocument();
  });

  it('shows the empty-clubs info alert and disables search/filter when no content', () => {
    useHomeDataMock.mockReturnValue({
      ...baseReturn(),
      data: { pods: [], clubs: [] },
      clubs: [],
      totalPods: 0,
    });
    renderPage();
    expect(screen.getByText(/No clubs in this category/)).toBeInTheDocument();
    expect(screen.getByText('search:off')).toBeInTheDocument();
    expect(screen.getByText('filter-menu:off')).toBeInTheDocument();
  });

  it('navigates to happening-nearby via the header and See all button', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    fireEvent.click(screen.getByLabelText('Open Happening nearby'));
    expect(navigateMock).toHaveBeenCalledWith('/happening-nearby');

    navigateMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'See all' }));
    expect(navigateMock).toHaveBeenCalledWith('/happening-nearby');
  });

  it('navigates to happening-nearby on keyboard Enter on the header', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    fireEvent.keyDown(screen.getByLabelText('Open Happening nearby'), { key: 'Enter' });
    expect(navigateMock).toHaveBeenCalledWith('/happening-nearby');
  });

  it('shows the Create pod FAB for hosts and navigates to create-pod', () => {
    useHomeDataMock.mockReturnValue({ ...baseReturn(), isHost: true });
    renderPage();
    const fab = screen.getByRole('button', { name: 'Create pod' });
    fireEvent.click(fab);
    expect(navigateMock).toHaveBeenCalledWith('/create-pod');
  });

  it('resets an out-of-range selected category during render', () => {
    useHomeDataMock.mockReturnValue(baseReturn());
    renderPage();
    // Select a category id that is not present in categoryChips -> HomePage's
    // guard clears it back to '' on the next render (no crash, still rendered).
    fireEvent.click(screen.getByText('select-missing'));
    expect(screen.getByText('Happening nearby')).toBeInTheDocument();
  });
});
