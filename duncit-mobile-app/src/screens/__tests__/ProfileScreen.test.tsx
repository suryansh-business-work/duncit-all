import { fireEvent, screen } from '@testing-library/react-native';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { useProfile } from '@/hooks/useProfile';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useProfile', () => ({ useProfile: jest.fn() }));
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockedProfile = useProfile as jest.Mock;

const me = {
  user_id: 'u',
  first_name: 'Sam',
  full_name: 'Sam Lee',
  email: 's@x.com',
  is_email_verified: true,
  profile_photo: null,
  bio: '',
  roles: ['HOST'],
  profile_links: [],
  followers_count: 0,
  following_count: 0,
  pet_profile: null,
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
});

describe('ProfileScreen', () => {
  it('shows the skeleton while loading', () => {
    mockedProfile.mockReturnValue({ me: null, posts: [], isLoading: true });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-loading')).toBeOnTheScreen();
  });

  it('renders the profile, navigates to host, and goes back', () => {
    mockedProfile.mockReturnValue({ me, posts: [], isLoading: false });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('Sam Lee')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-host'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
    fireEvent.press(screen.getByTestId('profile-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the error state when the profile is missing', () => {
    mockedProfile.mockReturnValue({ me: null, posts: [], isLoading: false });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-error')).toBeOnTheScreen();
  });

  it('routes to become-host / register-venue for users without those roles', () => {
    mockedProfile.mockReturnValue({ me: { ...me, roles: [] }, posts: [], isLoading: false });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('profile-host'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
    fireEvent.press(screen.getByTestId('profile-venue'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });
});
