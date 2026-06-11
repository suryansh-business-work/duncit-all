import { fireEvent, screen } from '@testing-library/react-native';

import { SearchScreen } from '@/screens/SearchScreen';
import { usePodSearch } from '@/hooks/usePodSearch';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
jest.mock('@/hooks/usePodSearch', () => ({ usePodSearch: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedSearch = usePodSearch as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Sunset Yoga',
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

describe('SearchScreen', () => {
  beforeEach(() => mockOpenPod.mockClear());

  it('shows the prompt before the user types', () => {
    mockedSearch.mockReturnValue({ results: [], hasQuery: false, isLoading: false });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-prompt')).toBeOnTheScreen();
  });

  it('shows the spinner while the server search is in flight', () => {
    mockedSearch.mockReturnValue({ results: [], hasQuery: true, isLoading: true });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-loading')).toBeOnTheScreen();
  });

  it('shows the empty state when a query has no matches', () => {
    mockedSearch.mockReturnValue({ results: [], hasQuery: true, isLoading: false });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-empty')).toBeOnTheScreen();
  });

  it('lists matching pods and opens one, updating the query input', () => {
    mockedSearch.mockReturnValue({ results: [pod], hasQuery: true, isLoading: false });
    renderWithProviders(<SearchScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'yoga');
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(mockOpenPod).toHaveBeenCalledWith('p1', 'Sunset Yoga');
  });
});
