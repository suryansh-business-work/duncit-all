import { fireEvent, screen } from '@testing-library/react-native';

import { ChatsScreen } from '@/screens/ChatsScreen';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { FollowingScreen } from '@/screens/FollowingScreen';
import { useChatRooms } from '@/hooks/useChat';
import { useFollowing } from '@/hooks/useFollowing';
import { useHomeData } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/hooks/useHomeFeed');
jest.mock('@/hooks/useFollowing');
jest.mock('@/hooks/useChat');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

const mockedHomeData = useHomeData as jest.Mock;
const mockedFollowing = useFollowing as jest.Mock;
const mockedChatRooms = useChatRooms as jest.Mock;

const club = (id: string) =>
  ({
    id,
    club_id: `cl-${id}`,
    club_name: `Club ${id}`,
    club_description: 'Fun club',
    club_feature_images_and_videos: [],
    category_id: null,
    super_category_id: null,
  }) as never;

beforeEach(() => {
  mockNavigate.mockClear();
  mockedHomeData.mockReturnValue({
    pods: [],
    clubs: [],
    categories: [],
    isLoading: false,
    refetch: jest.fn(),
  });
  mockedFollowing.mockReturnValue({
    people: [],
    followedClubs: [],
    isLoading: false,
    refetch: jest.fn(),
  });
  mockedChatRooms.mockReturnValue({ rooms: [], isLoading: false, refetch: jest.fn() });
});

describe('ClubsScreen', () => {
  it('renders club cards and opens club details', () => {
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [club('1')],
      categories: [{ id: 'cat1', name: 'Music', slug: 'm', level: 'CATEGORY', parent_id: null }],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-card-cl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: '1', title: 'Club 1' });
  });

  it('filters clubs by search query and category, then shows an empty message', () => {
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [
        { ...(club('1') as Record<string, unknown>), club_name: 'Runners', category_id: 'cat1' },
        { ...(club('2') as Record<string, unknown>), club_name: 'Painters', category_id: 'cat2' },
      ] as never,
      categories: [
        { id: 'cat1', name: 'Sports', slug: 's', level: 'CATEGORY', parent_id: null },
        { id: 'cat2', name: 'Arts', slug: 'a', level: 'CATEGORY', parent_id: null },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    // Search narrows to the matching club.
    fireEvent.changeText(screen.getByTestId('clubs-search-input'), 'Runner');
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-card-cl-2')).toBeNull();
    // Category filter to Arts drops the (sports) match → empty state.
    fireEvent.press(screen.getByTestId('clubs-filter-cat-cat2'));
    expect(screen.getByTestId('clubs-list-empty')).toBeOnTheScreen();
  });
});

describe('FollowingScreen', () => {
  it('shows an empty hint on the default People tab', () => {
    renderWithProviders(<FollowingScreen />);
    expect(screen.getByTestId('following-list-empty')).toBeOnTheScreen();
  });

  it('lists followed people (with + without photo) and opens a profile', () => {
    mockedFollowing.mockReturnValue({
      people: [
        { user_id: 'f1', full_name: 'Riya', profile_photo: 'pic.jpg' },
        { user_id: 'f2', full_name: null, profile_photo: null },
      ],
      followedClubs: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<FollowingScreen />);
    expect(screen.getByTestId('following-person-f2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('following-person-f1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'f1' });
  });

  it('switches to Clubs (with + without logo) and opens a club', () => {
    mockedFollowing.mockReturnValue({
      people: [],
      followedClubs: [
        {
          id: 'c1',
          club_name: 'Runners',
          club_feature_images_and_videos: [{ url: 'x', type: 'IMAGE' }],
        },
        { id: 'c2', club_name: 'NoLogo', club_feature_images_and_videos: [] },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<FollowingScreen />);
    fireEvent.press(screen.getByTestId('following-tab-clubs'));
    expect(screen.getByTestId('following-club-c2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('following-club-c1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: 'c1', title: 'Runners' });
  });
});

describe('ChatsScreen', () => {
  it('navigates to a room on press', () => {
    mockedChatRooms.mockReturnValue({
      rooms: [
        { id: 'r1', pod_id: 'pod9', pod_title: 'Coffee', pod_attendees: ['u1'], cover_url: null },
        { id: 'r2', pod_id: null, pod_title: 'Orphan', pod_attendees: [], cover_url: null },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ChatsScreen />);
    fireEvent.press(screen.getByTestId('chat-room-r2')); // no pod_id → no navigation
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('chat-room-r1'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatRoom', { podId: 'pod9', title: 'Coffee' });
  });
});
