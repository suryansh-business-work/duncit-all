import { act, fireEvent, screen } from '@testing-library/react-native';

import { ScreenRefreshProvider, useRefreshRegistration } from '@/components/PullToRefresh';
import { ChatsScreen } from '@/screens/ChatsScreen';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { FollowingScreen } from '@/screens/FollowingScreen';
import { useChatRooms } from '@/hooks/useChat';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/components/LocationDialog', () => ({ LocationDialog: () => null }));
jest.mock('@/hooks/useHomeFeed');
jest.mock('@/hooks/useFollowingFeed', () => ({ useFollowingFeed: jest.fn() }));
jest.mock('@/hooks/useFollowing', () => ({ useFollowing: jest.fn() }));
jest.mock('@/hooks/useChat');
jest.mock('@/hooks/useSuperCategories', () => ({ useSuperCategories: jest.fn() }));
jest.mock('@/hooks/useLocations', () => ({ useLocations: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({ data: { me: { user_id: 'me1' } } }),
}));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));
const mockViewer = jest.fn((_props: unknown) => null);
jest.mock('@/components/profile/post-viewer/PostViewerSheet', () => ({
  PostViewerSheet: (props: unknown) => mockViewer(props),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
  // TabScreen reads the route to tell Home from the other tabs.
  useRoute: () => ({ name: 'ClubsTab' }),
}));

const mockedHomeData = useHomeData as jest.Mock;
const mockedFeed = useFollowingFeed as jest.Mock;
const mockedFollowing = useFollowing as jest.Mock;
const mockedChatRooms = useChatRooms as jest.Mock;
const mockedSuperCats = useSuperCategories as jest.Mock;
const mockedLocations = useLocations as jest.Mock;

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

const feedPost = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  author_id: 'u1',
  club_id: null,
  image_url: 'https://img/p.jpg',
  media_type: 'IMAGE',
  kind: 'POST',
  caption: 'Hello world',
  likes_count: 2,
  liked_by_me: false,
  comments_count: 1,
  created_at: '2026-06-10T10:00:00Z',
  author: { user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'a.jpg' },
  ...over,
});

const emptyFeed = () => ({
  posts: [] as ReturnType<typeof feedPost>[],
  isLoading: false,
  error: undefined,
  refetch: jest.fn().mockResolvedValue(undefined),
  toggleLike: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockViewer.mockClear();
  mockAds = [];
  mockedHomeData.mockReturnValue({
    pods: [],
    clubs: [],
    categories: [],
    isLoading: false,
    refetch: jest.fn(),
  });
  mockedFeed.mockImplementation(() => emptyFeed());
  // The Clubs feed resolves a post's club doc id → slug via the followed clubs.
  mockedFollowing.mockReturnValue({ followedClubs: [{ id: 'c9', club_id: 'club-nine' }] });
  mockedChatRooms.mockReturnValue({ rooms: [], isLoading: false, refetch: jest.fn() });
  mockedSuperCats.mockReturnValue({
    superCats: [],
    selectedSuperId: null,
    selectedSlug: '',
    isLoading: false,
    select: jest.fn(),
  });
  mockedLocations.mockReturnValue(locationsApi());
});

// The admin's active cities — the Clubs tab groups clubs by these.
const LOCATIONS = [
  { id: 'loc1', location_name: 'Delhi NCR', city: 'Delhi', location_image: null },
  { id: 'loc2', location_name: 'Mumbai', city: null, location_image: null },
];
function locationsApi(over: Record<string, unknown> = {}) {
  return { selectedId: '', cityLabel: '', zoneName: '', locations: LOCATIONS, ...over };
}
const inCity = (id: string, locationId = 'loc1', extra: Record<string, unknown> = {}) =>
  ({ ...(club(id) as Record<string, unknown>), location_id: locationId, ...extra }) as never;

describe('ClubsScreen', () => {
  it('lists city cards first, opens a city, then opens club details', () => {
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [inCity('1'), inCity('2', 'loc2'), inCity('3', 'gone')],
      categories: [{ id: 'cat1', name: 'Music', slug: 'm', level: 'CATEGORY', parent_id: null }],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    // No header city: one card per city that has clubs; a club in an inactive
    // city has no card, and no club is listed yet.
    expect(screen.getByTestId('club-city-card-loc1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-city-card-loc2')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-city-card-gone')).toBeNull();
    expect(screen.queryByTestId('club-card-cl-1')).toBeNull();

    fireEvent.press(screen.getByTestId('club-city-card-loc1'));
    expect(screen.getByTestId('clubs-city-heading-title')).toHaveTextContent('Delhi');
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-card-cl-2')).toBeNull();
    fireEvent.press(screen.getByTestId('club-card-cl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubSlug: 'cl-1' });

    // "All cities" goes back to the city cards.
    fireEvent.press(screen.getByTestId('clubs-city-heading-action'));
    expect(screen.getByTestId('club-city-card-loc2')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-card-cl-1')).toBeNull();
  });

  it('filters clubs by search query and category, then shows an empty message', () => {
    mockedLocations.mockReturnValue(locationsApi({ selectedId: 'loc1', cityLabel: 'Delhi' }));
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [
        inCity('1', 'loc1', { club_name: 'Runners', category_id: 'cat1' }),
        inCity('2', 'loc1', { club_name: 'Painters', category_id: 'cat2' }),
      ],
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

  it('interleaves a sponsored banner after every 4 clubs', () => {
    mockAds = [
      {
        id: 'ad1',
        ad_type: 'IMAGE',
        media_url: 'https://cdn/ad.jpg',
        redirect_url: null,
        ad_title: 'Sponsored Club',
        position: 'CLUB_LIST',
      },
    ];
    // Inside a city, a banner is woven in after every 4 clubs of a locality.
    mockedLocations.mockReturnValue(locationsApi({ selectedId: 'loc1', cityLabel: 'Delhi' }));
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: ['1', '2', '3', '4', '5'].map((id) => inCity(id)),
      categories: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('ad-card-ad1')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Club')).toBeOnTheScreen();
    // Clubs still render around the woven banner.
    expect(screen.getByTestId('club-card-cl-4')).toBeOnTheScreen();
    expect(screen.getByTestId('club-card-cl-5')).toBeOnTheScreen();
  });

  it('shows only clubs in the selected location', () => {
    mockedLocations.mockReturnValue(locationsApi({ selectedId: 'loc1', cityLabel: 'Delhi' }));
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [
        { ...(club('1') as Record<string, unknown>), location_id: 'loc1' },
        { ...(club('2') as Record<string, unknown>), location_id: 'loc2' },
      ] as never,
      categories: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-card-cl-2')).toBeNull();
  });

  it('narrows to the selected locality/area within the city', () => {
    mockedLocations.mockReturnValue(
      locationsApi({ selectedId: 'loc1', cityLabel: 'Delhi', zoneName: 'Saket' }),
    );
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [
        { ...(club('1') as Record<string, unknown>), location_id: 'loc1', locality: 'Saket' },
        { ...(club('2') as Record<string, unknown>), location_id: 'loc1', locality: 'Rohini' },
      ] as never,
      categories: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-card-cl-2')).toBeNull();
  });

  it('shows the Reset-Location empty state when no club operates in the locality', () => {
    mockedLocations.mockReturnValue(
      locationsApi({ selectedId: 'loc1', cityLabel: 'Delhi', zoneName: 'Saket' }),
    );
    mockedHomeData.mockReturnValue({
      pods: [],
      clubs: [
        { ...(club('2') as Record<string, unknown>), location_id: 'loc1', locality: 'Rohini' },
      ] as never,
      categories: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ClubsScreen />);
    expect(screen.getByTestId('clubs-location-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('clubs-location-reset')).toBeOnTheScreen();
    expect(screen.queryByTestId('clubs-list-empty')).toBeNull();
  });
});

describe('FollowingScreen', () => {
  it('shows empty hints on both feed tabs', () => {
    renderWithProviders(<FollowingScreen />);
    expect(screen.getByTestId('following-feed-empty')).toBeOnTheScreen();
    expect(screen.getByText(/Follow people/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('following-tab-clubs'));
    expect(screen.getByText(/Follow clubs/)).toBeOnTheScreen();
  });

  it('renders the People feed: like press + author press → profile', () => {
    const people = { ...emptyFeed(), posts: [feedPost('p1')] };
    mockedFeed.mockImplementation((source: string) => (source === 'PEOPLE' ? people : emptyFeed()));
    renderWithProviders(<FollowingScreen />);
    expect(screen.getByTestId('feed-post-p1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('feed-like-p1'));
    expect(people.toggleLike).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    fireEvent.press(screen.getByTestId('feed-author-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u1' });
  });

  it('Clubs feed: club-scoped post opens the club', () => {
    const clubs = { ...emptyFeed(), posts: [feedPost('p2', { club_id: 'c9', kind: 'STORY' })] };
    mockedFeed.mockImplementation((source: string) => (source === 'CLUBS' ? clubs : emptyFeed()));
    renderWithProviders(<FollowingScreen />);
    fireEvent.press(screen.getByTestId('following-tab-clubs'));
    fireEvent.press(screen.getByTestId('feed-author-p2'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubSlug: 'club-nine' });
  });

  it('comment press opens the post viewer; onDeleted refetches and closes', () => {
    const people = { ...emptyFeed(), posts: [feedPost('p1')] };
    mockedFeed.mockImplementation((source: string) => (source === 'PEOPLE' ? people : emptyFeed()));
    renderWithProviders(<FollowingScreen />);
    fireEvent.press(screen.getByTestId('feed-comment-p1'));
    expect(mockViewer).toHaveBeenCalledWith(expect.objectContaining({ postId: 'p1', meId: 'me1' }));
    const props = mockViewer.mock.calls.at(-1)?.[0] as {
      onDeleted: () => void;
      onClose: () => void;
    };
    act(() => props.onDeleted());
    expect(people.refetch).toHaveBeenCalled();
    // Re-open then plain close.
    fireEvent.press(screen.getByTestId('feed-comment-p1'));
    const again = mockViewer.mock.calls.at(-1)?.[0] as { onClose: () => void };
    act(() => again.onClose());
  });

  it('pull-to-refresh on the feed reloads what the feed hooks registered', () => {
    const people = { ...emptyFeed(), posts: [feedPost('p1')] };
    const clubs = emptyFeed();
    // The real useFollowingFeed hands its reload to the screen's pull gesture;
    // the mock keeps that contract so the screen's wiring is what is tested.
    mockedFeed.mockImplementation((source: string) => {
      const feed = source === 'PEOPLE' ? people : clubs;
      useRefreshRegistration(feed.refetch);
      return feed;
    });
    renderWithProviders(
      <ScreenRefreshProvider>
        <FollowingScreen />
      </ScreenRefreshProvider>,
    );
    const control = screen.getByTestId('following-feed').props.refreshControl;
    expect(control.props.testID).toBe('screen-refresh');
    act(() => {
      control.props.onRefresh();
    });
    expect(people.refetch).toHaveBeenCalled();
    expect(clubs.refetch).toHaveBeenCalled();
  });
});

describe('ChatsScreen', () => {
  const FUTURE = '2099-01-01T10:00:00.000Z';
  const PAST = '2000-01-01T10:00:00.000Z';
  const room = (over: Record<string, unknown> = {}) => ({
    id: 'r1',
    pod_id: 'pod9',
    pod_slug: 'pod-9',
    pod_title: 'Coffee',
    pod_date_time: FUTURE,
    pod_end_date_time: null,
    pod_attendees: ['u1'],
    cover_url: null,
    club_id: 'c1',
    club_slug: 'club-1',
    super_category_id: null,
    ...over,
  });

  it('navigates to a room on press', () => {
    mockedChatRooms.mockReturnValue({
      rooms: [room(), room({ id: 'r2', pod_id: null, pod_title: 'Orphan', pod_attendees: [] })],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ChatsScreen />);
    fireEvent.press(screen.getByTestId('chat-room-r2')); // no pod_id → no navigation
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('chat-room-r1'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatRoom', { podId: 'pod9', title: 'Coffee' });
  });

  it('filters rooms by pod title and shows a no-match message', () => {
    mockedChatRooms.mockReturnValue({
      rooms: [
        room(),
        room({ id: 'r2', pod_id: 'pod8', pod_title: 'Painting', pod_attendees: [] }),
        // A title-less room must not crash the filter and never matches.
        room({ id: 'r3', pod_id: 'pod7', pod_title: null, pod_attendees: [] }),
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ChatsScreen />);
    fireEvent.changeText(screen.getByTestId('chats-search-input'), 'coff');
    expect(screen.getByTestId('chat-room-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-room-r2')).toBeNull();
    expect(screen.queryByTestId('chat-room-r3')).toBeNull();
    // A query that matches nothing falls back to the no-match message.
    fireEvent.changeText(screen.getByTestId('chats-search-input'), 'zzz');
    expect(screen.getByText('No chats match your filters.')).toBeOnTheScreen();
  });

  it('classifies rooms by the selected super category (For You / For Your Pet)', () => {
    mockedSuperCats.mockReturnValue({
      superCats: [],
      selectedSuperId: 'human',
      selectedSlug: 'for-you',
      isLoading: false,
      select: jest.fn(),
    });
    mockedChatRooms.mockReturnValue({
      rooms: [
        room({ id: 'r1', super_category_id: 'human' }),
        room({ id: 'r2', pod_id: 'pod8', pod_title: 'Pet Walk', super_category_id: 'pet' }),
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ChatsScreen />);
    expect(screen.getByTestId('chat-room-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-room-r2')).toBeNull();
  });

  it('narrows the list to Upcoming or Previous pods', () => {
    mockedChatRooms.mockReturnValue({
      rooms: [
        room({ id: 'r1', pod_date_time: FUTURE }),
        room({ id: 'r2', pod_id: 'pod8', pod_title: 'Old Pod', pod_date_time: PAST }),
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<ChatsScreen />);
    fireEvent.press(screen.getByTestId('chat-filter-UPCOMING'));
    expect(screen.getByTestId('chat-room-r1')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-room-r2')).toBeNull();
    fireEvent.press(screen.getByTestId('chat-filter-PREVIOUS'));
    expect(screen.queryByTestId('chat-room-r1')).toBeNull();
    expect(screen.getByTestId('chat-room-r2')).toBeOnTheScreen();
  });

  it('shows the empty hint when there are no rooms at all', () => {
    mockedChatRooms.mockReturnValue({ rooms: [], isLoading: false, refetch: jest.fn() });
    renderWithProviders(<ChatsScreen />);
    expect(screen.getByText(/No chats yet/)).toBeOnTheScreen();
  });
});
