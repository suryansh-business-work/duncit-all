import { fireEvent, screen } from '@testing-library/react-native';

import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { useClubDetails } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDetails', () => ({ useClubDetails: jest.fn() }));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { clubId: 'c1', title: 'Runners' } }),
}));

const mockedClub = useClubDetails as jest.Mock;

const club = {
  id: 'c1',
  club_id: 'cl-1',
  club_name: 'Runners',
  club_description: 'We run',
  club_feature_images_and_videos: [],
  club_moments: [],
  club_whats_app_community_link: null,
  club_whats_app_group_link: null,
  meetup_venues_id: [],
  category_id: null,
};

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Morning Run',
  pod_date_time: '2026-06-12T06:30:00.000Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_attendees: [],
  no_of_spots: 10,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  place_label: null,
  place_detail: null,
};

beforeEach(() => {
  mockGoBack.mockClear();
  mockNavigate.mockClear();
});

describe('ClubDetailsScreen', () => {
  it('shows the spinner while loading', () => {
    mockedClub.mockReturnValue({ club: null, pods: [], isLoading: true });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByTestId('club-details-loading')).toBeOnTheScreen();
  });

  it('renders the club, its pod, and opens a pod', () => {
    mockedClub.mockReturnValue({ club, pods: [pod], isLoading: false });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Morning Run' });
    fireEvent.press(screen.getByTestId('detail-back')); // DetailHero onBack
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the unavailable state and goes back', () => {
    mockedClub.mockReturnValue({ club: null, pods: [], isLoading: false });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByTestId('club-details-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
