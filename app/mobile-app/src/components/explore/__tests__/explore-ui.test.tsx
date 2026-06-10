import { FlatList } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { ExploreReels } from '@/components/explore/ExploreReels';
import { useExplore } from '@/hooks/useExplore';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useExplore');
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockedExplore = useExplore as jest.Mock;

const pod = (id: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    pod_title: `Pod ${id}`,
    pod_description: 'A fun pod',
    pod_date_time: '2026-06-10T18:30:00.000Z',
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    pod_attendees: ['u1'],
    no_of_spots: 5,
    host_names: [],
    pod_images_and_videos: [],
    club_id: 'c1',
    club_slug: 's',
    place_label: 'Cafe',
    place_detail: null,
    zone_name: null,
    like_count: 3,
    liked_by_me: false,
    comment_count: 2,
  }) as never;

describe('ExplorePodCard', () => {
  it('renders the pod and fires like/save/open actions', () => {
    const onToggleLike = jest.fn();
    const onToggleSave = jest.fn();
    const onOpen = jest.fn();
    renderWithProviders(
      <ExplorePodCard
        pod={pod('1')}
        width={390}
        height={700}
        saved={false}
        like={{ liked_by_me: false, like_count: 3 }}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reel-like-p-1'));
    expect(onToggleLike).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('reel-save-p-1'));
    expect(onToggleSave).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('reel-go-p-1'));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('ExploreReels', () => {
  const base = {
    pods: [pod('1')],
    clubsById: new Map(),
    isLoading: false,
    hasData: true,
    isSaved: () => false,
    isSavePending: () => false,
    likeStateFor: () => ({ liked_by_me: false, like_count: 3 }),
    toggleSave: jest.fn(),
    toggleLike: jest.fn(),
    refetch: jest.fn(),
  };

  const layout = () =>
    fireEvent(screen.getByTestId('explore-reels'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 700 } },
    });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockedExplore.mockReturnValue(base);
  });

  it('renders a reel after layout and opens pod details', () => {
    renderWithProviders(<ExploreReels />);
    layout();
    expect(screen.getByTestId('reel-p-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reel-go-p-1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: '1', title: 'Pod 1' });
  });

  it('wires the per-reel save/like handlers and item layout', () => {
    renderWithProviders(<ExploreReels />);
    layout();
    fireEvent.press(screen.getByTestId('reel-save-p-1'));
    expect(base.toggleSave).toHaveBeenCalledWith('1', false);
    fireEvent.press(screen.getByTestId('reel-like-p-1'));
    expect(base.toggleLike).toHaveBeenCalledWith('1', { liked_by_me: false, like_count: 3 });

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.getItemLayout(null, 2)).toEqual({ length: 700, offset: 1400, index: 2 });
  });

  it('shows the empty state with no pods', () => {
    mockedExplore.mockReturnValue({ ...base, pods: [] });
    renderWithProviders(<ExploreReels />);
    layout();
    expect(screen.getByTestId('explore-empty')).toBeOnTheScreen();
  });

  it('shows the skeleton while loading', () => {
    mockedExplore.mockReturnValue({ ...base, pods: [], isLoading: true, hasData: false });
    renderWithProviders(<ExploreReels />);
    layout();
    expect(screen.getByTestId('explore-loading')).toBeOnTheScreen();
  });
});
