import { FlatList, Share } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';

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
jest.mock('@/components/explore/LikesListSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    LikesListSheet: ({ userIds, onClose }: { userIds: string[]; onClose: () => void }) => (
      <View testID="explore-likes-sheet">
        <Text testID="explore-likes-count">{userIds.length}</Text>
        <Text testID="explore-likes-close" onPress={onClose}>
          close
        </Text>
      </View>
    ),
  };
});

const mockedExplore = useExplore as jest.Mock;
const mockUseVideoPlayer = useVideoPlayer as jest.Mock;

const pod = (id: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    pod_title: `Pod ${id}`,
    pod_description: 'A fun pod',
    pod_date_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    pod_attendees: ['u1'],
    no_of_spots: 5,
    host_names: [],
    pod_images_and_videos: [],
    reel_url: `https://cdn/reel-${id}.mp4`,
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
        isActive={false}
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

  it('shows the expired notice and hides the Join CTA for an expired pod', () => {
    const expiredPod = {
      ...(pod('1') as Record<string, unknown>),
      pod_date_time: '2020-01-01T00:00:00.000Z',
    } as never;
    renderWithProviders(
      <ExplorePodCard
        pod={expiredPod}
        width={390}
        height={700}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 3 }}
        commentCount={2}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('This pod is expired')).toBeOnTheScreen();
    expect(screen.queryByTestId('reel-go-p-1')).toBeNull();
  });

  it('renders the liked/saved/pending states and an unlimited-spots join label', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={{ ...(pod('v') as Record<string, unknown>), no_of_spots: 0 } as never}
        width={390}
        height={2000}
        isActive={false}
        saved
        savePending
        like={{ liked_by_me: true, like_count: 9 }}
        commentCount={1}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    // no_of_spots = 0 → the join label omits the "/N" capacity suffix.
    expect(screen.getByTestId('reel-join-p-v')).toBeOnTheScreen();
    expect(screen.getByText('9')).toBeOnTheScreen();
  });

  it('collapses overflow actions into a More menu on short screens', () => {
    const onOpen = jest.fn();
    renderWithProviders(
      <ExplorePodCard
        pod={pod('1')}
        width={390}
        height={700}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 3 }}
        commentCount={2}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={onOpen}
      />,
    );
    // The least-used actions move into the "More" menu.
    expect(screen.queryByTestId('reel-share-p-1')).toBeNull();
    fireEvent.press(screen.getByTestId('reel-more'));
    fireEvent.press(screen.getByTestId('reel-more-open'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows every action inline when the screen is tall enough', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={pod('tall')}
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 3 }}
        commentCount={2}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByTestId('reel-share-p-tall')).toBeOnTheScreen();
    expect(screen.queryByTestId('reel-more')).toBeNull();
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    fireEvent.press(screen.getByTestId('reel-share-p-tall'));
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('swallows share errors (user cancelled)', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('cancelled'));
    renderWithProviders(
      <ExplorePodCard
        pod={pod('err')}
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('reel-share-p-err'));
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    shareSpy.mockRestore();
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
        isActive={false}
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

  it('shows the verified badge, expands the caption and opens the club (items 6,14,15)', () => {
    const onOpenClub = jest.fn();
    renderWithProviders(
      <ExplorePodCard
        pod={
          { ...(pod('vp') as Record<string, unknown>), pod_description: 'd'.repeat(120) } as never
        }
        club={
          {
            id: 'c1',
            club_id: 'cid',
            club_name: 'Paws Club',
            is_verified: true,
            club_feature_images_and_videos: [],
          } as never
        }
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
        onOpenClub={onOpenClub}
      />,
    );
    expect(screen.getByTestId('explore-club-verified')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('explore-club-link'));
    expect(onOpenClub).toHaveBeenCalled();
    // Caption starts collapsed ("More"); tapping it expands to "Show less".
    expect(screen.getByText('More')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('explore-caption-wrap'));
    expect(screen.getByText('Show less')).toBeOnTheScreen();
  });

  it('opens the likers list when the like count is tapped (item 8)', () => {
    const onShowLikers = jest.fn();
    renderWithProviders(
      <ExplorePodCard
        pod={pod('lk')}
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 4 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
        onShowLikers={onShowLikers}
      />,
    );
    fireEvent.press(screen.getByTestId('reel-like-p-lk-count'));
    expect(onShowLikers).toHaveBeenCalled();
  });

  it('disables the likers tap when there are no likes (item 8)', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={pod('nolk')}
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
        onShowLikers={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('reel-like-p-nolk-count')).toBeNull();
  });

  it('omits the verified badge and caption toggle for short, unverified content', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={pod('plain')}
        club={
          {
            id: 'c1',
            club_id: 'cid',
            club_name: 'Plain Club',
            is_verified: false,
            club_feature_images_and_videos: [],
          } as never
        }
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('explore-club-verified')).toBeNull();
    expect(screen.queryByTestId('explore-caption-toggle')).toBeNull();
    // Tapping the (non-collapsible) caption wrapper is a no-op.
    fireEvent.press(screen.getByTestId('explore-caption-wrap'));
    expect(screen.getByTestId('explore-caption')).toBeOnTheScreen();
  });

  it('plays the muted looping reel while active and re-asserts play once ready', () => {
    renderWithProviders(
      <ExplorePodCard
        pod={pod('vid')}
        width={390}
        height={700}
        isActive
        saved={false}
        like={{ liked_by_me: false, like_count: 0 }}
        commentCount={0}
        onToggleLike={jest.fn()}
        onToggleSave={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByTestId('reel-video-p-vid')).toBeOnTheScreen();
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(player.loop).toBe(true);
    expect(player.muted).toBe(true);
    expect(player.play).toHaveBeenCalled();
    // A slow remote source: play is re-asserted only when it reports ready.
    const [event, listener] = player.addListener.mock.calls[0];
    expect(event).toBe('statusChange');
    const playsBefore = player.play.mock.calls.length;
    listener({ status: 'loading' });
    expect(player.play.mock.calls.length).toBe(playsBefore);
    listener({ status: 'readyToPlay' });
    expect(player.play.mock.calls.length).toBe(playsBefore + 1);
  });

  it('pauses the reel and drops the ready-listener while the card is inactive', () => {
    const props = {
      width: 390,
      height: 700,
      saved: false,
      like: { liked_by_me: false, like_count: 0 },
      commentCount: 0,
      onToggleLike: jest.fn(),
      onToggleSave: jest.fn(),
      onComment: jest.fn(),
      onOpen: jest.fn(),
    };
    const { rerender } = renderWithProviders(
      <ExplorePodCard pod={pod('idle')} isActive {...props} />,
    );
    const activePlayer = mockUseVideoPlayer.mock.results.at(-1)?.value;
    const sub = activePlayer.addListener.mock.results[0]?.value;
    // Swiping away deactivates the card: the listener detaches and it pauses.
    rerender(<ExplorePodCard pod={pod('idle')} isActive={false} {...props} />);
    expect(sub.remove).toHaveBeenCalled();
    const idlePlayer = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(idlePlayer.pause).toHaveBeenCalled();
    expect(idlePlayer.play).not.toHaveBeenCalled();
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

  it('plays only the visible reel and follows viewability changes', () => {
    mockedExplore.mockReturnValue({ ...base, pods: [pod('1'), pod('2')] });
    renderWithProviders(<ExploreReels />);
    layout();
    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.viewabilityConfig).toEqual({ itemVisiblePercentThreshold: 60 });
    // Index 0 starts active: its player plays, the second card's pauses.
    let [first, second] = mockUseVideoPlayer.mock.results.slice(-2).map((r) => r.value);
    expect(first.play).toHaveBeenCalled();
    expect(second.pause).toHaveBeenCalled();
    // Swipe to the second reel → it becomes the only playing card.
    act(() => list.props.onViewableItemsChanged({ viewableItems: [{ index: 1 }] }));
    [first, second] = mockUseVideoPlayer.mock.results.slice(-2).map((r) => r.value);
    expect(first.pause).toHaveBeenCalled();
    expect(second.play).toHaveBeenCalled();
    // Empty / index-less viewability events keep the current reel active.
    act(() => list.props.onViewableItemsChanged({ viewableItems: [] }));
    act(() => list.props.onViewableItemsChanged({ viewableItems: [{ index: null }] }));
    [, second] = mockUseVideoPlayer.mock.results.slice(-2).map((r) => r.value);
    expect(second.play).toHaveBeenCalled();
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

  it('pull-to-refresh reloads the feed (item 12)', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockedExplore.mockReturnValue({ ...base, refetch });
    renderWithProviders(<ExploreReels />);
    layout();
    const list = screen.UNSAFE_getByType(FlatList);
    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('opens the club page from a reel (item 14)', () => {
    mockedExplore.mockReturnValue({
      ...base,
      clubsById: new Map([
        ['c1', { club_name: 'Paws Club', is_verified: true, club_feature_images_and_videos: [] }],
      ]),
    });
    renderWithProviders(<ExploreReels />);
    layout();
    fireEvent.press(screen.getByTestId('explore-club-link'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: 'c1', title: 'Paws Club' });
  });

  it('opens and closes the likers sheet from a reel (item 8)', () => {
    mockedExplore.mockReturnValue({
      ...base,
      pods: [{ ...(pod('1') as Record<string, unknown>), liked_user_ids: ['a', 'b'] } as never],
    });
    renderWithProviders(<ExploreReels />);
    layout();
    fireEvent.press(screen.getByTestId('reel-like-p-1-count'));
    expect(screen.getByTestId('explore-likes-sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('explore-likes-count')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('explore-likes-close'));
    expect(screen.queryByTestId('explore-likes-sheet')).toBeNull();
  });

  it('falls back to a generic club title when the club is unknown (item 14)', () => {
    mockedExplore.mockReturnValue({ ...base, clubsById: new Map() });
    renderWithProviders(<ExploreReels />);
    layout();
    // The link itself only renders with a name, so exercise the resolver directly.
    screen.UNSAFE_getByType(ExplorePodCard).props.onOpenClub();
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: 'c1', title: 'Club' });
  });
});
