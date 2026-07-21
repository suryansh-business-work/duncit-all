import { act, fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideo } from '@/components/status/StatusVideo';
import { StatusViewer } from '@/components/status/StatusViewer';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStoryRail } from '@/hooks/useStoryRail';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useStoryRail');
jest.mock('@/hooks/useStatusUpload');
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
// Controlled status store — an empty, frozen seenIds keeps the rail order driven
// purely by the (deterministic) shuffle so the navigation walks stay stable.
const mockSeenIds = new Set<string>();
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) =>
    selector({
      recordView: jest.fn(),
      deleteStory: jest.fn().mockResolvedValue(undefined),
      seenIds: mockSeenIds,
    }),
}));

const mockedRail = useStoryRail as jest.Mock;
const mockedUpload = useStatusUpload as jest.Mock;

const imageSlide = {
  id: 'p1',
  imageUrl: 'http://x/img.jpg',
  mediaType: 'IMAGE',
  caption: 'Hello',
  createdAt: '2026-06-09T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 3 * 3_600_000).toISOString(),
};
const videoSlide = {
  id: 'p2',
  imageUrl: 'http://x/clip.mp4',
  mediaType: 'VIDEO',
  caption: '',
  createdAt: '2026-06-09T11:00:00.000Z',
};
const group = {
  authorId: 'a1',
  name: 'Asha',
  photo: null,
  slides: [imageSlide, videoSlide],
  cover: videoSlide,
};
const mineGroup = {
  authorId: 'me',
  name: 'You',
  photo: null,
  slides: [imageSlide],
  cover: imageSlide,
};

describe('StatusTile', () => {
  it('fires onPress and onBadgePress independently', () => {
    const onPress = jest.fn();
    const onBadgePress = jest.fn();
    renderWithProviders(
      <StatusTile testID="tile" label="You" badge onPress={onPress} onBadgePress={onBadgePress} />,
    );
    fireEvent.press(screen.getByTestId('tile'));
    expect(onPress).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('tile-badge'));
    expect(onBadgePress).toHaveBeenCalled();
  });

  it('renders a badge tile without a testID', () => {
    renderWithProviders(<StatusTile label="No id" badge />);
    expect(screen.getByText('No id')).toBeOnTheScreen();
  });

  it('shows the upload progress overlay while posting (Bug 1)', () => {
    renderWithProviders(
      <StatusTile testID="up" label="Me" image="http://x/me.jpg" progress={45} />,
    );
    expect(screen.getByTestId('up-progress')).toBeOnTheScreen();
    expect(screen.getByText('45%')).toBeOnTheScreen();
  });

  it('hides the overlay once complete and greys the ring when seen (Bug 2)', () => {
    renderWithProviders(<StatusTile testID="dn" label="Me" progress={100} seen />);
    expect(screen.queryByTestId('dn-progress')).toBeNull();
    expect(screen.getByTestId('dn-seen-ring')).toBeOnTheScreen();
    expect(screen.getByText('Me')).toBeOnTheScreen();
  });

  it('renders no grey seen-ring while a story is unseen', () => {
    renderWithProviders(<StatusTile testID="un" label="Me" />);
    expect(screen.queryByTestId('un-seen-ring')).toBeNull();
  });

  it('renders a seen tile without a testID (no seen-ring id emitted)', () => {
    renderWithProviders(<StatusTile label="Anon" seen />);
    expect(screen.getByText('Anon')).toBeOnTheScreen();
  });
});

describe('StatusVideo', () => {
  it('advances only when the clip reports it ended', () => {
    const onEnded = jest.fn();
    renderWithProviders(<StatusVideo uri="http://x/clip.mp4" onEnded={onEnded} />);
    const view = screen.getByTestId('status-video');
    fireEvent(view, 'message', { nativeEvent: { data: 'playing' } });
    expect(onEnded).not.toHaveBeenCalled();
    fireEvent(view, 'message', { nativeEvent: { data: 'ended' } });
    expect(onEnded).toHaveBeenCalled();
  });
});

describe('StatusViewer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders the first image, its caption and the expiry countdown, and closes', () => {
    const onClose = jest.fn();
    renderWithProviders(<StatusViewer status={group as never} onClose={onClose} />);
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    expect(screen.getByText('Hello')).toBeOnTheScreen();
    // imageSlide expires ~3h from now → the "time remaining" label is visible.
    expect(screen.getByTestId('status-remaining')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-advances from image to video after 15s', () => {
    renderWithProviders(<StatusViewer status={group as never} onClose={jest.fn()} />);
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(15000));
    expect(screen.getByTestId('status-video')).toBeOnTheScreen();
  });

  it('closes after the final slide finishes', () => {
    const onClose = jest.fn();
    renderWithProviders(<StatusViewer status={mineGroup as never} onClose={onClose} />);
    act(() => jest.advanceTimersByTime(15000));
    expect(onClose).toHaveBeenCalled();
  });

  it('advances and rewinds via the tap zones', () => {
    renderWithProviders(<StatusViewer status={group as never} onClose={jest.fn()} />);
    // Prev at the first slide is a no-op (stays on the image).
    fireEvent.press(screen.getByTestId('status-prev'));
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next'));
    expect(screen.getByTestId('status-video')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-prev'));
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
  });

  it('advances when a video slide reports it ended', () => {
    const onClose = jest.fn();
    renderWithProviders(<StatusViewer status={group as never} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('status-next')); // → video slide
    fireEvent(screen.getByTestId('status-video'), 'message', { nativeEvent: { data: 'ended' } });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when the group has no slides', () => {
    const empty = { authorId: 'a1', name: 'Asha', photo: null, slides: [], cover: imageSlide };
    renderWithProviders(<StatusViewer status={empty as never} onClose={jest.fn()} />);
    expect(screen.queryByTestId('status-viewer-image')).toBeNull();
    expect(screen.queryByTestId('status-video')).toBeNull();
  });

  it('jumps to the next author at the end instead of closing (bug 2)', () => {
    const onNext = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <StatusViewer status={mineGroup as never} onClose={onClose} onNext={onNext} />,
    );
    act(() => jest.advanceTimersByTime(15000));
    expect(onNext).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('taps to the previous author from the first slide (bug 2)', () => {
    const onPrev = jest.fn();
    renderWithProviders(
      <StatusViewer status={mineGroup as never} onClose={jest.fn()} onPrev={onPrev} />,
    );
    fireEvent.press(screen.getByTestId('status-prev'));
    expect(onPrev).toHaveBeenCalled();
  });

  it('swipes left to the next author and right to the previous one (bug 2)', () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();
    renderWithProviders(
      <StatusViewer status={group as never} onClose={jest.fn()} onNext={onNext} onPrev={onPrev} />,
    );
    const area = screen.getByTestId('status-swipe');
    fireEvent(area, 'responderGrant', { nativeEvent: { pageX: 250 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 40 } });
    expect(onNext).toHaveBeenCalled();
    fireEvent(area, 'responderGrant', { nativeEvent: { pageX: 40 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 250 } });
    expect(onPrev).toHaveBeenCalled();
  });

  it('ignores a swipe shorter than the threshold (bug 2)', () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();
    renderWithProviders(
      <StatusViewer status={group as never} onClose={jest.fn()} onNext={onNext} onPrev={onPrev} />,
    );
    const area = screen.getByTestId('status-swipe');
    fireEvent(area, 'responderGrant', { nativeEvent: { pageX: 100 } });
    fireEvent(area, 'responderRelease', { nativeEvent: { pageX: 110 } });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('likes a story and bumps the count, then unlikes it (Bug 5)', () => {
    const onToggleLike = jest.fn();
    const likeSlide = { ...imageSlide, id: 'lp', likedByMe: false, likesCount: 2 };
    const likeGroup = { ...group, slides: [likeSlide], cover: likeSlide };
    renderWithProviders(
      <StatusViewer status={likeGroup as never} onClose={jest.fn()} onToggleLike={onToggleLike} />,
    );
    expect(screen.getByTestId('status-like-count')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('status-like'));
    expect(onToggleLike).toHaveBeenCalledWith('lp');
    expect(screen.getByTestId('status-like-count')).toHaveTextContent('3');
  });

  it('hides the like count when unliking down to zero (Bug 5)', () => {
    const onToggleLike = jest.fn();
    const likeSlide = { ...imageSlide, id: 'lp0', likedByMe: true, likesCount: 1 };
    const likeGroup = { ...group, slides: [likeSlide], cover: likeSlide };
    renderWithProviders(
      <StatusViewer status={likeGroup as never} onClose={jest.fn()} onToggleLike={onToggleLike} />,
    );
    fireEvent.press(screen.getByTestId('status-like'));
    expect(onToggleLike).toHaveBeenCalledWith('lp0');
    expect(screen.queryByTestId('status-like-count')).toBeNull();
  });

  it('opens the viewers sheet for an own story (Bug 4)', () => {
    const onViewers = jest.fn();
    renderWithProviders(
      <StatusViewer status={mineGroup as never} onClose={jest.fn()} onViewers={onViewers} />,
    );
    fireEvent.press(screen.getByTestId('status-viewers'));
    expect(onViewers).toHaveBeenCalledWith('p1');
  });

  it('deletes an own story from the kebab menu, which then closes (Bug 7)', () => {
    const onDelete = jest.fn();
    renderWithProviders(
      <StatusViewer status={mineGroup as never} onClose={jest.fn()} onDelete={onDelete} />,
    );
    expect(screen.queryByTestId('status-viewer-menu')).toBeNull();
    fireEvent.press(screen.getByTestId('status-viewer-kebab'));
    expect(screen.getByTestId('status-viewer-menu')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    expect(onDelete).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('status-viewer-menu')).toBeNull();
  });

  it('records each slide as it is shown so the ring greys (Bug 2)', () => {
    const onSlideSeen = jest.fn();
    renderWithProviders(
      <StatusViewer status={group as never} onClose={jest.fn()} onSlideSeen={onSlideSeen} />,
    );
    expect(onSlideSeen).toHaveBeenCalledWith('p1');
    fireEvent.press(screen.getByTestId('status-next'));
    expect(onSlideSeen).toHaveBeenCalledWith('p2');
  });
});

const userItem = {
  ...group,
  key: 'user-a1',
  subLabel: 'Asha Verma',
  target: { kind: 'user' as const, id: 'a1' },
};
const userItem2 = {
  authorId: 'a2',
  name: 'Bina',
  photo: null,
  slides: [imageSlide],
  cover: imageSlide,
  key: 'user-a2',
  target: { kind: 'user' as const, id: 'a2' },
};

describe('StatusRail (bug 3 composite)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Deterministic rail order (Fisher–Yates with random=0 is stable per input).
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockedUpload.mockReturnValue({
      uploading: false,
      pickAndUpload: jest.fn().mockResolvedValue(undefined),
    });
    mockedRail.mockReturnValue({ mine: null, items: [userItem], isLoading: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads from the own tile when there is no story yet', () => {
    const pickAndUpload = jest.fn().mockResolvedValue(undefined);
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('posts or discards a previewed story video from the trim sheet (Bug 3)', () => {
    const confirmVideo = jest.fn().mockResolvedValue(undefined);
    const cancelVideo = jest.fn();
    mockedUpload.mockReturnValue({
      uploading: false,
      pickAndUpload: jest.fn().mockResolvedValue(undefined),
      pendingVideo: {
        uri: 'file://v.mp4',
        durationSeconds: 20,
        fileName: 'v.mp4',
        mimeType: 'video/mp4',
      },
      confirmVideo,
      cancelVideo,
    });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('story-video-post'));
    expect(confirmVideo).toHaveBeenCalledWith({ start: 0, duration: 15 });
    fireEvent.press(screen.getByTestId('story-video-cancel'));
    expect(cancelVideo).toHaveBeenCalled();
  });

  it('opens my own viewer when I already have a story, and adds via the badge', () => {
    const pickAndUpload = jest.fn().mockResolvedValue(undefined);
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    mockedRail.mockReturnValue({ mine: mineGroup, items: [userItem], isLoading: false });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-mine-badge'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('does not upload from the tile or the badge while an upload is in flight', () => {
    const pickAndUpload = jest.fn().mockResolvedValue(undefined);
    mockedUpload.mockReturnValue({ uploading: true, pickAndUpload });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    fireEvent.press(screen.getByTestId('status-mine-badge'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('opens a followed item and deep-links via Open details (bug 3)', () => {
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-user-a1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    expect(screen.getByText('Asha Verma')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-open-target'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'a1' });
  });

  it('deep-links a followed club to its detail screen (bug 3)', () => {
    const clubItem = {
      ...userItem2,
      key: 'club-c1',
      target: { kind: 'club' as const, id: 'c1', clubSlug: 'runners', title: 'Runners' },
    };
    mockedRail.mockReturnValue({ mine: null, items: [clubItem], isLoading: false });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-club-c1'));
    fireEvent.press(screen.getByTestId('status-open-target'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubSlug: 'runners' });
  });

  it('uses the avatar fallback when my latest story is a video', () => {
    const videoMine = {
      authorId: 'me',
      name: 'You',
      photo: null,
      slides: [videoSlide],
      cover: videoSlide,
    };
    mockedRail.mockReturnValue({ mine: videoMine, items: [], isLoading: false });
    renderWithProviders(<StatusRail userName="Sam" userPhoto="http://x/me.jpg" />);
    expect(screen.getByTestId('status-mine')).toBeOnTheScreen();
  });

  it('walks to the next item at the end and closes after the last (bug 2)', () => {
    mockedRail.mockReturnValue({ mine: null, items: [userItem, userItem2], isLoading: false });
    renderWithProviders(<StatusRail userName="Sam" />);
    // The two unseen tiles shuffle (random=0) to the order [a2, a1].
    fireEvent.press(screen.getByTestId('status-user-a2'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next')); // a2's only slide → item a1 (image)
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next')); // a1 image → video
    fireEvent.press(screen.getByTestId('status-next')); // a1 last slide → close
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('walks back to the previous item from the first slide (bug 2)', () => {
    mockedRail.mockReturnValue({ mine: mineGroup, items: [userItem, userItem2], isLoading: false });
    renderWithProviders(<StatusRail userName="Sam" />);
    // groups = [mine, a2, a1] after the shuffle; a2 sits at index 1.
    fireEvent.press(screen.getByTestId('status-user-a2')); // open item a2
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-prev')); // first slide → previous item (mine)
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
  });

  it('stays open on the very first item when tapping back (bug 2)', () => {
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-user-a1')); // index 0
    fireEvent.press(screen.getByTestId('status-prev')); // i === 0 → no-op
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
  });

  it('freezes the open story when the rail data changes, re-syncing on close', () => {
    const { rerender } = renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-user-a1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    // A background reload empties the rail — the open story stays frozen (visible),
    // so viewing it never jumps/re-indexes mid-view.
    mockedRail.mockReturnValue({ mine: null, items: [], isLoading: false });
    rerender(<StatusRail userName="Sam" />);
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    // Closing re-syncs the rail to the new (now empty) data.
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });
});
