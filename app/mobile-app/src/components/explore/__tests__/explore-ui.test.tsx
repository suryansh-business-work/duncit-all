import { FlatList } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { ExploreReels } from '@/components/explore/ExploreReels';
import { useExplore } from '@/hooks/useExplore';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useExplore');
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/components/details/pod-comments', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    PodCommentsSheet: ({
      podId,
      onClose,
      onCountChange,
    }: {
      podId: string;
      onClose: () => void;
      onCountChange: (delta: number) => void;
    }) => (
      <View testID="explore-comments-sheet">
        <Text testID="explore-comments-pod">{podId}</Text>
        <Text testID="explore-comments-add" onPress={() => onCountChange(1)}>
          add
        </Text>
        <Text testID="explore-comments-close" onPress={onClose}>
          close
        </Text>
      </View>
    ),
  };
});

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
  it('renders the pod and fires like/save/comment/open actions', () => {
    const onToggleLike = jest.fn();
    const onToggleSave = jest.fn();
    const onComment = jest.fn();
    const onOpen = jest.fn();
    renderWithProviders(
      <ExplorePodCard
        pod={pod('1')}
        width={390}
        height={700}
        saved={false}
        like={{ liked_by_me: false, like_count: 3 }}
        commentCount={2}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onComment={onComment}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
    // Free pods hide the payment copy (BUG-9).
    expect(screen.getByText('Free spot')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reel-like-p-1'));
    expect(onToggleLike).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('reel-save-p-1'));
    expect(onToggleSave).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('reel-comment-p-1'));
    expect(onComment).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('reel-go-p-1'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows the "Confirm with UPI" payment copy for paid pods (BUG-9)', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={
          {
            ...(pod('2') as Record<string, unknown>),
            pod_type: 'NATIVE_PAID',
            pod_amount: 250,
          } as never
        }
        width={390}
        height={700}
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('₹250 · Confirm with UPI')).toBeOnTheScreen();
  });
});

describe('ExploreReels', () => {
  const bumpComment = jest.fn();
  const base = {
    pods: [pod('1')],
    clubsById: new Map(),
    isLoading: false,
    hasData: true,
    viewerId: 'me',
    isSaved: () => false,
    isSavePending: () => false,
    likeStateFor: () => ({ liked_by_me: false, like_count: 3 }),
    commentCountFor: () => 2,
    bumpComment,
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
    bumpComment.mockClear();
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

  it('opens comments inline (no redirect) and bumps the count', () => {
    renderWithProviders(<ExploreReels />);
    layout();
    fireEvent.press(screen.getByTestId('reel-comment-p-1'));
    expect(screen.getByTestId('explore-comments-sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('explore-comments-pod')).toHaveTextContent('1');
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('explore-comments-add'));
    expect(bumpComment).toHaveBeenCalledWith('1', 1);
    fireEvent.press(screen.getByTestId('explore-comments-close'));
    expect(screen.queryByTestId('explore-comments-sheet')).toBeNull();
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
