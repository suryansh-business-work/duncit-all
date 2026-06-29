import { fireEvent, screen } from '@testing-library/react-native';

import { SearchScreen } from '@/screens/SearchScreen';
import { useSearchCategories, useSearchDiscovery, useSearchSuggestions } from '@/hooks/useSearch';
import type { SearchClubResult } from '@/hooks/useSearch';
import { renderWithProviders } from '@/utils/test-utils';

const mockOpenPod = jest.fn();
const mockOpenClub = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@/hooks/useDetailNav', () => ({
  useDetailNav: () => ({ openPod: mockOpenPod, openClub: mockOpenClub }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useSearch', () => ({
  useSearchDiscovery: jest.fn(),
  useSearchSuggestions: jest.fn(),
  useSearchCategories: jest.fn(),
}));
jest.mock('@/hooks/useFollow', () => ({
  useClubFollow: () => ({ following: false, busy: false, toggle: jest.fn() }),
}));

const mockDiscovery = useSearchDiscovery as jest.Mock;
const mockSuggestions = useSearchSuggestions as jest.Mock;
const mockCategories = useSearchCategories as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-p1',
  pod_title: 'Sunset Yoga',
  pod_date_time: '2030-01-01T00:00:00.000Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  location_id: null,
  pod_mode: null,
  place_label: null,
  place_detail: null,
  pod_attendees: [],
};

const clubResult = {
  is_following: false,
  participant_count: 0,
  next_pod_date: null,
  upcoming_pods: [pod],
  club: {
    id: 'c1',
    club_id: 'club-1',
    club_name: 'Club 1',
    club_description: 'desc',
    followers_count: 1,
    category_id: null,
    super_category_id: null,
    club_feature_images_and_videos: [],
  },
} as unknown as SearchClubResult;

const discovery = (over: Record<string, unknown> = {}) => ({
  happening: [],
  moreClubs: [],
  loading: false,
  active: false,
  refetch: jest.fn(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDiscovery.mockReturnValue(discovery());
  mockSuggestions.mockReturnValue([]);
  mockCategories.mockReturnValue({
    categories: [
      { id: 'c1', name: 'Sports', slug: 'sports', icon: null, level: 'CATEGORY', parent_id: null },
    ],
    nameOf: () => null,
  });
});

describe('SearchScreen', () => {
  it('shows category quick-actions before any input and selects one', () => {
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-category-actions')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-cat-c1'));
  });

  it('reveals suggestions while typing and hides them after picking one', () => {
    mockSuggestions.mockReturnValue([{ text: 'Badminton', kind: 'CLUB' }]);
    renderWithProviders(<SearchScreen />);
    expect(screen.queryByTestId('search-suggestions')).toBeNull();
    fireEvent.changeText(screen.getByTestId('search-input'), 'bad');
    expect(screen.getByTestId('search-suggestions')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-suggestion-0'));
    expect(screen.queryByTestId('search-suggestions')).toBeNull();
  });

  it('opens a club and a pod from active results', () => {
    mockDiscovery.mockReturnValue(discovery({ happening: [clubResult], active: true }));
    mockCategories.mockReturnValue({ categories: [], nameOf: () => null });
    renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-happening')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Club 1'));
    expect(mockOpenClub).toHaveBeenCalledWith('c1', 'Club 1');
    fireEvent.press(screen.getByTestId('pod-card-pod-p1'));
    expect(mockOpenPod).toHaveBeenCalledWith('p1', 'Sunset Yoga');
  });

  it('routes the empty-state CTAs to Pod Ideas and Earn', () => {
    mockDiscovery.mockReturnValue(discovery({ active: true }));
    renderWithProviders(<SearchScreen />);
    fireEvent.press(screen.getByTestId('search-cta-idea'));
    expect(mockNavigate).toHaveBeenCalledWith('PodIdeas');
    fireEvent.press(screen.getByTestId('search-cta-earn'));
    expect(mockNavigate).toHaveBeenCalledWith('Earn');
  });
});
