import { act, fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideo } from '@/components/status/StatusVideo';
import { StatusViewer } from '@/components/status/StatusViewer';
import { useStatus } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useStatus');
jest.mock('@/hooks/useStatusUpload');

const mockedStatus = useStatus as jest.Mock;
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
      <StatusTile
        testID="tile"
        label="You"
        badge
        ring
        onPress={onPress}
        onBadgePress={onBadgePress}
      />,
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
});

describe('StatusRail', () => {
  beforeEach(() => {
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload: jest.fn() });
    mockedStatus.mockReturnValue({ statuses: [group], mine: null });
  });

  it('uploads from the own tile when there is no story yet', () => {
    const pickAndUpload = jest.fn();
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('opens my own viewer when I already have a story, and adds via the badge', () => {
    const pickAndUpload = jest.fn();
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    mockedStatus.mockReturnValue({ statuses: [group], mine: mineGroup });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-mine-badge'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('does not upload from the tile or the badge while an upload is in flight', () => {
    const pickAndUpload = jest.fn();
    mockedUpload.mockReturnValue({ uploading: true, pickAndUpload });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    fireEvent.press(screen.getByTestId('status-mine-badge'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('opens the viewer when another status is tapped', () => {
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-a1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
  });

  it('uses the avatar fallback when my latest story is a video', () => {
    const videoMine = {
      authorId: 'me',
      name: 'You',
      photo: null,
      slides: [videoSlide],
      cover: videoSlide,
    };
    mockedStatus.mockReturnValue({ statuses: [], mine: videoMine });
    renderWithProviders(<StatusRail userName="Sam" userPhoto="http://x/me.jpg" />);
    expect(screen.getByTestId('status-mine')).toBeOnTheScreen();
  });

  it('renders another author tile from their profile photo', () => {
    const withPhoto = { ...group, photo: 'http://x/asha.jpg' };
    mockedStatus.mockReturnValue({ statuses: [withPhoto], mine: null });
    renderWithProviders(<StatusRail userName="Sam" />);
    expect(screen.getByTestId('status-a1')).toBeOnTheScreen();
  });

  it('walks to the next author at the end and closes after the last (bug 2)', () => {
    const group2 = {
      authorId: 'a2',
      name: 'Bina',
      photo: null,
      slides: [imageSlide],
      cover: imageSlide,
    };
    mockedStatus.mockReturnValue({ statuses: [group, group2], mine: null });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-a1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next')); // image → video (author 1)
    fireEvent.press(screen.getByTestId('status-next')); // last slide → author 2
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next')); // author 2 last slide → close
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('walks back to the previous author from the first slide (bug 2)', () => {
    const group2 = {
      authorId: 'a2',
      name: 'Bina',
      photo: null,
      slides: [imageSlide],
      cover: imageSlide,
    };
    mockedStatus.mockReturnValue({ statuses: [group, group2], mine: mineGroup });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-a2')); // open author 2
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-prev')); // first slide → previous author
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
  });
});
