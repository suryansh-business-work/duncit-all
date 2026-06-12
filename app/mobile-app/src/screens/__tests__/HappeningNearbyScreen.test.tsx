import { fireEvent, screen } from '@testing-library/react-native';

import { HappeningNearbyScreen } from '@/screens/HappeningNearbyScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
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
  beforeEach(() => mockOpenPod.mockClear());

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
});
