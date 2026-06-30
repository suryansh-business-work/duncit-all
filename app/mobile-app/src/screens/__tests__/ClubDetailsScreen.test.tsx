import { act, fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { useClubDetails } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDetails', () => ({ useClubDetails: jest.fn() }));

const mockClubToggle = jest.fn();
jest.mock('@/hooks/useFollow', () => ({
  useClubFollow: () => ({ following: false, busy: false, toggle: mockClubToggle }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: mockNavigate }),
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
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  hosts: [],
};

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Morning Run',
  pod_date_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
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
    mockedClub.mockReturnValue({ club: null, pods: [], members: [], isLoading: true });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByTestId('club-details-loading')).toBeOnTheScreen();
  });

  it('renders the club, its pod, and opens a pod', () => {
    mockedClub.mockReturnValue({
      club,
      pods: [pod],
      members: [{ user_id: 'm1', full_name: 'Asha', profile_photo: null }],
      followingInitially: false,
      isLoading: false,
    });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-follow'));
    expect(mockClubToggle).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Morning Run' });
    // Members rail → full profile (B4-12).
    fireEvent.press(screen.getByTestId('attendees-avatar-group'));
    fireEvent.press(screen.getByTestId('attendee-row-m1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'm1' });
    fireEvent.press(screen.getByTestId('detail-back')); // DetailHero onBack
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('share button triggers Share.share', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    mockedClub.mockReturnValue({
      club,
      pods: [],
      members: [],
      followingInitially: false,
      isLoading: false,
    });
    renderWithProviders(<ClubDetailsScreen />);
    fireEvent.press(screen.getByTestId('hb-share'));
    await act(async () => {});
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('shows the unavailable state and goes back', () => {
    mockedClub.mockReturnValue({ club: null, pods: [], members: [], isLoading: false });
    renderWithProviders(<ClubDetailsScreen />);
    expect(screen.getByTestId('club-details-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
