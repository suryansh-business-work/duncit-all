import { fireEvent, screen } from '@testing-library/react-native';

import { PreviousPodsScreen } from '@/screens/PreviousPodsScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedFeed = useHomeFeed as jest.Mock;

const pod = {
  id: 'old',
  pod_id: 'pod-old',
  pod_title: 'Old Jam',
  club_id: 'c1',
  club_slug: 's',
  no_of_spots: 4,
  pod_amount: 0,
  pod_type: 'NATIVE_FREE',
  pod_date_time: '2020-01-01T00:00:00.000Z',
  pod_images_and_videos: [],
  host_names: [],
  place_label: null,
  place_detail: null,
};

describe('PreviousPodsScreen', () => {
  beforeEach(() => mockOpenPod.mockClear());

  it('shows the empty state when there are no previous pods', () => {
    mockedFeed.mockReturnValue({ previousPods: [] });
    renderWithProviders(<PreviousPodsScreen />);
    expect(screen.getByTestId('previous-pods-empty')).toBeOnTheScreen();
  });

  it('lists previous pods and opens one', () => {
    mockedFeed.mockReturnValue({ previousPods: [pod] });
    renderWithProviders(<PreviousPodsScreen />);
    expect(screen.getByTestId('previous-pods-screen')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-card-pod-old'));
    expect(mockOpenPod).toHaveBeenCalledWith('old', 'Old Jam');
  });
});
