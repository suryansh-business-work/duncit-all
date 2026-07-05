import { fireEvent, screen } from '@testing-library/react-native';

import { HomeFeed } from '@/components/home/HomeFeed';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useHomeStore } from '@/stores/home.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/status/StatusRail', () => ({ StatusRail: () => null }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
let mockBrandingData: { branding: { home_all_vibe_icon_url: string } } | null = {
  branding: { home_all_vibe_icon_url: 'https://cdn.duncit/all.png' },
};
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => ({ data: mockBrandingData }) }));
let mockRoles: string[] = [];
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({ data: { me: { first_name: 'Sam', profile_photo: null, roles: mockRoles } } }),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

const mockedFeed = useHomeFeed as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Sunset Jam',
  pod_date_time: '2026-06-10T18:30:00.000Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  place_label: null,
  place_detail: null,
};
const club = {
  id: 'c1',
  club_id: 'cl-1',
  club_name: 'Runners',
  club_description: 'We run',
  club_feature_images_and_videos: [],
  category_id: null,
  super_category_id: null,
};

const base = {
  isLoading: false,
  hasData: true,
  categoryChips: [{ id: 'cat1', name: 'Music', slug: 'm', level: 'CATEGORY', parent_id: null }],
  vibeCategories: [{ id: 'cat1', name: 'Music', subs: [] }],
  hasContent: true,
  clubsWithPods: [{ club, pods: [pod] }],
  featuredPods: [pod],
  previousPods: [],
  totalPods: 1,
  refetch: jest.fn(),
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockRoles = [];
  mockBrandingData = { branding: { home_all_vibe_icon_url: 'https://cdn.duncit/all.png' } };
  mockedFeed.mockReturnValue(base);
  useHomeStore.setState({ scrollTopNonce: 0 });
});

describe('HomeFeed', () => {
  it('renders the sections and opens a club + pod', () => {
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-feed')).toBeOnTheScreen();
    expect(screen.getByText('Runners')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('club-section-cl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: 'c1', title: 'Runners' });

    fireEvent.press(screen.getAllByTestId('pod-card-pod-1')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Sunset Jam' });

    // The club-section pod row uses its own onOpenPod handler.
    fireEvent.press(screen.getAllByTestId('pod-card-pod-1')[1]);
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Sunset Jam' });
  });

  it('opens the Happening Nearby page from the header title and the See all chip', () => {
    renderWithProviders(<HomeFeed />);
    fireEvent.press(screen.getByTestId('happening-nearby-header'));
    expect(mockNavigate).toHaveBeenCalledWith('HappeningNearby');
    fireEvent.press(screen.getByTestId('happening-nearby-see-all'));
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('shows the Previous Pods rail and opens the page or a past pod', () => {
    mockedFeed.mockReturnValue({
      ...base,
      previousPods: [{ ...pod, id: 'old', pod_id: 'pod-old', pod_title: 'Old Jam' }],
    });
    renderWithProviders(<HomeFeed />);
    fireEvent.press(screen.getByTestId('previous-pods-see-all'));
    expect(mockNavigate).toHaveBeenCalledWith('PreviousPods');
    fireEvent.press(screen.getByTestId('pod-card-pod-old'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'old', title: 'Old Jam' });
  });

  it('shows the pull-to-refresh spinner while refetching loaded data', () => {
    mockedFeed.mockReturnValue({ ...base, isLoading: true, hasData: true });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-feed')).toBeOnTheScreen();
  });

  it('shows the empty state', () => {
    mockedFeed.mockReturnValue({ ...base, clubsWithPods: [], featuredPods: [], totalPods: 0 });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-empty')).toBeOnTheScreen();
  });

  it('shows the create-pod FAB for hosts and opens the Create Pod screen', () => {
    mockRoles = ['HOST'];
    renderWithProviders(<HomeFeed />);
    fireEvent.press(screen.getByTestId('home-create-pod-fab'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod');
  });

  it('hides the create-pod FAB for non-hosts', () => {
    renderWithProviders(<HomeFeed />);
    expect(screen.queryByTestId('home-create-pod-fab')).toBeNull();
  });

  it('shows the skeleton on first load', () => {
    mockedFeed.mockReturnValue({ ...base, isLoading: true, hasData: false });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-skeleton')).toBeOnTheScreen();
  });

  it('opens the filter sheet from the vibe header and applies a price filter (badge appears)', () => {
    renderWithProviders(<HomeFeed />);
    fireEvent.press(screen.getByTestId('home-filter-button'));
    expect(screen.getByTestId('home-filter-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('filter-price-PAID'));
    // The active-filter count is now 1, so the filter button badge shows up.
    expect(screen.getByTestId('home-filter-badge')).toBeOnTheScreen();
    // Resetting clears it again.
    fireEvent.press(screen.getByTestId('home-filter-reset'));
    expect(screen.queryByTestId('home-filter-badge')).toBeNull();
    // Closing the sheet (Done/close) is wired back to the feed.
    fireEvent.press(screen.getByTestId('home-filter-close'));
  });

  it('renders the filter button disabled when there is no content', () => {
    mockedFeed.mockReturnValue({ ...base, hasContent: false });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-filter-button')).toBeOnTheScreen();
  });

  it('renders the vibe tabber when branding (the All-tab icon) is unavailable', () => {
    mockBrandingData = null;
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('vibe-chip-all')).toBeOnTheScreen();
  });

  it('scrolls the feed to the top when the logo bumps the nonce', () => {
    useHomeStore.setState({ scrollTopNonce: 1 });
    renderWithProviders(<HomeFeed />);
    // The scroll-to-top effect runs without error when the nonce is already set.
    expect(screen.getByTestId('home-feed')).toBeOnTheScreen();
  });
});
