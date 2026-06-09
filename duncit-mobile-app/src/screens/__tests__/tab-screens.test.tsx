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
  useNavigation: () => ({ navigate: mockNavigate }),
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
  mockedHomeData.mockReturnValue({ pods: [], clubs: [], isLoading: false, refetch: jest.fn() });
  mockedFollowing.mockReturnValue({ followedPods: [], isLoading: false, refetch: jest.fn() });
  mockedChatRooms.mockReturnValue({ rooms: [], isLoading: false, refetch: jest.fn() });
});

describe('ClubsScreen', () => {
  it('renders club cards and opens club details', () => {
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [club('1')],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-card-cl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: '1', title: 'Club 1' });
  });
});

describe('FollowingScreen', () => {
  it('shows an empty hint with no followed pods', () => {
    renderWithProviders(<FollowingScreen />);
    expect(screen.getByTestId('following-list-empty')).toBeOnTheScreen();
  });

  it('lists followed pods and opens one', () => {
    mockedFollowing.mockReturnValue({
      followedPods: [
        {
          id: 'p1',
          pod_id: 'pod-1',
          pod_title: 'Pod',
          pod_date_time: '2026-06-10T18:30:00.000Z',
          pod_type: 'NATIVE_FREE',
          pod_amount: 0,
          pod_attendees: [],
          no_of_spots: 4,
          host_names: [],
          pod_images_and_videos: [],
          club_id: 'c1',
          club_slug: 's',
          place_label: null,
          place_detail: null,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<FollowingScreen />);
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Pod' });
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
