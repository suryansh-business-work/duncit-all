import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { useProfile } from '@/hooks/useProfile';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useProfile', () => ({ useProfile: jest.fn() }));
jest.mock('@/components/profile/post-viewer/PostViewerSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    PostViewerSheet: ({ onDeleted }: { onDeleted: () => void }) => (
      <Pressable testID="post-viewer-deleted" onPress={onDeleted}>
        <Text>viewer</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/hooks/useStatusUpload', () => ({ useStatusUpload: jest.fn() }));
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockedProfile = useProfile as jest.Mock;
const mockedUpload = useStatusUpload as jest.Mock;
const refetch = jest.fn().mockResolvedValue(undefined);
const pickAndUpload = jest.fn().mockResolvedValue(undefined);

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
  refetch.mockClear();
  pickAndUpload.mockClear();
  mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
});

describe('ProfileScreen', () => {
  it('shows the skeleton while loading', () => {
    mockedProfile.mockReturnValue({ me: null, posts: [], isLoading: true, refetch });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-loading')).toBeOnTheScreen();
  });

  it('renders the profile, navigates to host, and goes back', () => {
    mockedProfile.mockReturnValue({ me, posts: [], isLoading: false, refetch });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('Sam Lee')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-host'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
    fireEvent.press(screen.getByTestId('profile-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
    fireEvent.press(screen.getByTestId('profile-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the error state when the profile is missing', () => {
    mockedProfile.mockReturnValue({ me: null, posts: [], isLoading: false, refetch });
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-error')).toBeOnTheScreen();
  });

  it('routes to become-host / register-venue for users without those roles', () => {
    mockedProfile.mockReturnValue({
      me: { ...me, roles: [] },
      posts: [],
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('profile-host'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
    fireEvent.press(screen.getByTestId('profile-venue'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });

  it('routes a venue owner to venue management', () => {
    mockedProfile.mockReturnValue({
      me: { ...me, roles: ['VENUE_OWNER'] },
      posts: [],
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('profile-venue'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
  });

  it('adds a post (pick + upload, then refetch)', async () => {
    mockedProfile.mockReturnValue({ me, posts: [], isLoading: false, refetch });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('profile-add-post'));
    await waitFor(() => expect(pickAndUpload).toHaveBeenCalled());
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('refetches the profile after a post is deleted from the viewer', async () => {
    mockedProfile.mockReturnValue({
      me,
      posts: [
        {
          id: 'p1',
          image_url: 'https://i/a.jpg',
          caption: 'hi',
          likes_count: 0,
          comments_count: 0,
          created_at: '',
        },
      ] as never,
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('post-p1'));
    fireEvent.press(screen.getByTestId('post-viewer-deleted'));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });
});
