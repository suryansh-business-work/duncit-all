import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

const useHomeData = vi.fn();
vi.mock('../home-page/useHomeData', () => ({
  useHomeData: (args: unknown) => useHomeData(args),
}));

const useActiveAds = vi.fn();
vi.mock('../../components/ads/useActiveAds', () => ({
  useActiveAds: (pos: unknown) => useActiveAds(pos),
}));

// Lightweight stand-ins so we can assert what the page renders per entry.
vi.mock('../home-page/PodCard', () => ({
  default: ({ pod, hostName, onOpen }: any) => (
    <button type="button" onClick={onOpen} data-testid="pod-card">
      {pod.pod_id} · {hostName ?? 'no-host'}
    </button>
  ),
}));
vi.mock('../../components/ads/AdCard', () => ({
  default: ({ ad }: any) => <div data-testid="ad-card">{ad.id}</div>,
}));

import HappeningNearbyPage from '../HappeningNearbyPage';

const baseHome = {
  activePods: [] as any[],
  loading: false,
  error: undefined as Error | undefined,
  hostNameOf: (p: any) => `host-of-${p.pod_id}`,
};

const setHome = (over: Partial<typeof baseHome>) =>
  useHomeData.mockReturnValue({ ...baseHome, ...over });

const setAds = (ads: any[]) => useActiveAds.mockReturnValue({ ads });

const props = { superCategorySlug: 'sports', locationId: 'loc-1', zoneName: 'Baner' };

const renderPage = () => render(<HappeningNearbyPage {...props} />);

beforeEach(() => {
  setHome({});
  setAds([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HappeningNearbyPage', () => {
  it('always renders the header title and subtitle', () => {
    renderPage();
    expect(screen.getByText('Happening nearby')).toBeInTheDocument();
    expect(screen.getByText('Live pods around your selected city')).toBeInTheDocument();
  });

  it('forwards the props to useHomeData and asks for POD_LIST ads', () => {
    renderPage();
    expect(useHomeData).toHaveBeenCalledWith(
      expect.objectContaining({
        superCategorySlug: 'sports',
        locationId: 'loc-1',
        zoneName: 'Baner',
        categoryId: '',
        priceFilter: 'ALL',
        dateFilter: 'ALL',
        sortBy: 'DATE_ASC',
      }),
    );
    expect(useActiveAds).toHaveBeenCalledWith('POD_LIST');
  });

  it('shows the spinner while loading with no pods yet', () => {
    setHome({ loading: true, activePods: [] });
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders pods (not the spinner) while loading if some are already present', () => {
    setHome({ loading: true, activePods: [{ id: '1', pod_id: 'P1', club_slug: 'c1' }] });
    renderPage();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-card')).toBeInTheDocument();
  });

  it('shows the error alert when the hook returns an error', () => {
    setHome({ error: new Error('kaboom') });
    renderPage();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('shows the empty state when there are no pods', () => {
    setHome({ activePods: [] });
    renderPage();
    expect(screen.getByText('No live pods around you right now.')).toBeInTheDocument();
  });

  it('renders a pod card per pod with its host name and navigates on open', () => {
    setHome({
      activePods: [
        { id: '1', pod_id: 'P1', club_slug: 'club-a' },
        { id: '2', pod_id: 'P2', club_slug: 'club-b' },
      ],
    });
    renderPage();
    const cards = screen.getAllByTestId('pod-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('P1 · host-of-P1');
    fireEvent.click(cards[0]);
    expect(navigate).toHaveBeenCalledWith('/club/club-a/pod/P1');
  });

  it('interleaves an ad card after every 4 pods', () => {
    setHome({
      activePods: Array.from({ length: 4 }, (_, i) => ({
        id: String(i),
        pod_id: `P${i}`,
        club_slug: 'c',
      })),
    });
    setAds([{ id: 'ad-1' }]);
    renderPage();
    expect(screen.getAllByTestId('pod-card')).toHaveLength(4);
    expect(screen.getByTestId('ad-card')).toHaveTextContent('ad-1');
  });
});
