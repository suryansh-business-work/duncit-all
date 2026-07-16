import { fireEvent, screen } from '@testing-library/react-native';

import { HappeningNearbyScreen } from '@/screens/HappeningNearbyScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedFeed = useHomeFeed as jest.Mock;

const pod = {
  id: 'live',
  pod_id: 'pod-live',
  pod_title: 'Live Jam',
  club_id: 'c1',
  club_slug: 's',
  no_of_spots: 4,
  pod_amount: 0,
  pod_type: 'NATIVE_FREE',
  pod_date_time: '2030-01-01T00:00:00.000Z',
  pod_images_and_videos: [],
  host_names: [],
  place_label: null,
  place_detail: null,
};

describe('HappeningNearbyScreen', () => {
  beforeEach(() => {
    mockOpenPod.mockClear();
    mockAds = [];
  });

  it('shows the empty state when there are no live pods', () => {
    mockedFeed.mockReturnValue({ activePods: [] });
    renderWithProviders(<HappeningNearbyScreen />);
    expect(screen.getByTestId('happening-nearby-empty')).toBeOnTheScreen();
  });

  it('lists live pods and opens one', () => {
    mockedFeed.mockReturnValue({ activePods: [pod] });
    renderWithProviders(<HappeningNearbyScreen />);
    expect(screen.getByTestId('happening-nearby-screen')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-card-pod-live'));
    expect(mockOpenPod).toHaveBeenCalledWith('live', 'Live Jam');
  });

  it('interleaves a full-width sponsored banner after every 4 pods', () => {
    mockAds = [
      {
        id: 'ad1',
        ad_type: 'IMAGE',
        media_url: 'https://cdn/ad.jpg',
        redirect_url: null,
        ad_title: 'Sponsored Pod',
        position: 'POD_LIST',
      },
    ];
    const pods = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => ({
      ...pod,
      id,
      pod_id: `pod-${id}`,
    }));
    mockedFeed.mockReturnValue({ activePods: pods });
    renderWithProviders(<HappeningNearbyScreen />);
    expect(screen.getByTestId('ad-card-ad1')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Pod')).toBeOnTheScreen();
    // Pods still render around the woven banner.
    expect(screen.getByTestId('pod-card-pod-p4')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-card-pod-p5')).toBeOnTheScreen();
  });
});
