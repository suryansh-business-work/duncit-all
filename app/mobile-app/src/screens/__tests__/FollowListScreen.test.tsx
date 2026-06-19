import { fireEvent, screen } from '@testing-library/react-native';

import { FollowListScreen } from '@/screens/FollowListScreen';
import { useFollowList } from '@/hooks/useFollowList';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useFollowList');
jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { me: { user_id: 'me' } } }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
  useRoute: () => ({ params: { userId: 'target', tab: 'followers' } }),
}));

const mockedList = useFollowList as jest.Mock;
const toggle = jest.fn();

const people = [
  {
    user_id: 'a',
    username: 'a1',
    full_name: 'Asha',
    first_name: 'Asha',
    profile_photo: null,
    is_following: false,
  },
  {
    user_id: 'me',
    username: 'me1',
    full_name: 'Me',
    first_name: 'Me',
    profile_photo: 'http://p',
    is_following: false,
  },
];

beforeEach(() => {
  mockNavigate.mockClear();
  toggle.mockClear();
  mockedList.mockReturnValue({
    people,
    isLoading: false,
    busyId: null,
    toggle,
    refetch: jest.fn(),
  });
});

describe('FollowListScreen (bug 9)', () => {
  it('lists people with @handles and hides the follow button for myself', () => {
    renderWithProviders(<FollowListScreen />);
    expect(screen.getByText('@a1')).toBeOnTheScreen();
    expect(screen.getByTestId('follow-toggle-a')).toBeOnTheScreen();
    // No follow button on my own row.
    expect(screen.queryByTestId('follow-toggle-me')).toBeNull();
  });

  it('toggles follow and opens a person profile', () => {
    renderWithProviders(<FollowListScreen />);
    fireEvent.press(screen.getByTestId('follow-toggle-a'));
    expect(toggle).toHaveBeenCalledWith(people[0]);
    fireEvent.press(screen.getByTestId('follow-open-a'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'a' });
  });

  it('switches between the Followers and Following tabs', () => {
    renderWithProviders(<FollowListScreen />);
    fireEvent.press(screen.getByTestId('follow-tab-following'));
    expect(screen.getByTestId('follow-tab-following')).toHaveProp('aria-pressed', true);
  });

  it('shows the empty state for both tabs', () => {
    mockedList.mockReturnValue({
      people: [],
      isLoading: false,
      busyId: null,
      toggle,
      refetch: jest.fn(),
    });
    renderWithProviders(<FollowListScreen />);
    expect(screen.getByText('No followers yet.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('follow-tab-following'));
    expect(screen.getByText('Not following anyone yet.')).toBeOnTheScreen();
  });

  it('falls back for people with missing names/photos', () => {
    mockedList.mockReturnValue({
      people: [
        {
          user_id: 'x',
          username: 'x1',
          full_name: null,
          first_name: 'Bob',
          profile_photo: null,
          is_following: true,
        },
        {
          user_id: 'y',
          username: 'y1',
          full_name: null,
          first_name: null,
          profile_photo: null,
          is_following: false,
        },
      ],
      isLoading: false,
      busyId: 'x',
      toggle,
      refetch: jest.fn(),
    });
    renderWithProviders(<FollowListScreen />);
    expect(screen.getByText('Bob')).toBeOnTheScreen(); // full_name null → first_name
    expect(screen.getByText('Duncit user')).toBeOnTheScreen(); // all null fallback
  });
});
