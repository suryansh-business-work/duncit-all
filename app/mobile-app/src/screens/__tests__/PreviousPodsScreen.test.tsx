import { fireEvent, screen } from '@testing-library/react-native';

import { PreviousPodsScreen } from '@/screens/PreviousPodsScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
// Reached from Home's "See all" with no params, or with the row it was tapped from.
let mockRouteParams: { initialIndex?: number } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedFeed = useHomeFeed as jest.Mock;
/** The feed as the hook returns it: no category chips, content iff any pods. */
const feed = (previousPods: unknown[]) => ({
  previousPods,
  categoryChips: [],
  hasContent: previousPods.length > 0,
});

const pod = {
  id: 'old',
  pod_id: 'pod-old',
  pod_title: 'Old Jam',
  club_id: 'c1',
  club_slug: 's',
  no_of_spots: 4,
  pod_amount: 0,
  pod_type: 'FREE',
  pod_date_time: '2020-01-01T00:00:00.000Z',
  pod_images_and_videos: [],
  host_names: [],
  place_label: null,
  place_detail: null,
};

describe('PreviousPodsScreen', () => {
  beforeEach(() => {
    mockOpenPod.mockClear();
    mockRouteParams = undefined;
  });

  it('shows the empty state when there are no previous pods', () => {
    mockedFeed.mockReturnValue(feed([]));
    renderWithProviders(<PreviousPodsScreen />);
    expect(screen.getByTestId('previous-pods-empty')).toBeOnTheScreen();
  });

  it('lists previous pods and opens one', () => {
    mockedFeed.mockReturnValue(feed([pod]));
    renderWithProviders(<PreviousPodsScreen />);
    expect(screen.getByTestId('previous-pods-screen')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-card-pod-old'));
    // The doc id rides along so the details screen need not resolve the slug.
    expect(mockOpenPod).toHaveBeenCalledWith('s', 'pod-old', 'old');
  });

  it('still lists the pods when opened at a row index past the end of the list', () => {
    mockRouteParams = { initialIndex: 5 };
    mockedFeed.mockReturnValue(feed([pod]));
    renderWithProviders(<PreviousPodsScreen />);
    fireEvent.press(screen.getByTestId('pod-card-pod-old'));
    // The doc id rides along so the details screen need not resolve the slug.
    expect(mockOpenPod).toHaveBeenCalledWith('s', 'pod-old', 'old');
  });
});
