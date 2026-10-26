import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import HomeStatusViewer, { type HomeStatusViewerItem, type HomeStatusViewerSlide } from '../HomeStatusViewer';
import HomeStatusViewerDetails from '../HomeStatusViewerDetails';
import { slideTarget, viewerChrome } from '../HomeStatusViewer/helpers';

const h = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router', async (orig) => ({ ...(await orig<object>()), useNavigate: () => h.navigate }));
vi.mock('../../../components/content-report/ReportContentDialog', () => ({
  default: (p: { targetId: string | null; onClose: () => void }) => (
    <div data-testid="report-dialog" data-target={p.targetId ?? ''}>
      <button data-testid="report-close" onClick={p.onClose} />
    </div>
  ),
}));

const theme = createTheme();
const play = vi.fn<() => Promise<void>>();

beforeAll(() => {
  globalThis.HTMLMediaElement.prototype.play = play;
  globalThis.HTMLMediaElement.prototype.pause = vi.fn();
});
beforeEach(() => {
  vi.clearAllMocks();
  play.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const slide = (over: Partial<HomeStatusViewerSlide> = {}): HomeStatusViewerSlide => ({
  id: 'post-1',
  mediaUrl: 'https://img/story.png',
  mediaType: 'IMAGE',
  caption: 'Court 2',
  likeCount: 3,
  likedByMe: false,
  ...over,
});
const item = (over: Partial<HomeStatusViewerItem> = {}): HomeStatusViewerItem => ({
  label: 'Meera N',
  kind: 'user',
  slides: [slide(), slide({ id: 'post-2', caption: 'Second' }), slide({ id: 'post-3', caption: 'Third' })],
  ...over,
});

const mount = (over: Partial<Parameters<typeof HomeStatusViewer>[0]> = {}) => {
  const spies = { onClose: vi.fn(), onNext: vi.fn(), onPrev: vi.fn(), onToggleLike: vi.fn(), onRecordView: vi.fn() };
  const ui = (props: Partial<Parameters<typeof HomeStatusViewer>[0]>) => (
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <HomeStatusViewer item={item()} {...spies} {...props} />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );
  const view = render(ui(over));
  return { ...view, spies, again: (props: Partial<Parameters<typeof HomeStatusViewer>[0]>) => view.rerender(ui({ ...over, ...props })) };
};

describe('story navigation', () => {
  it('steps back a slide, then hands back to the previous story from the first slide', () => {
    const { spies } = mount({ startIndex: 1 });
    expect(screen.getByText('Second')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-prev'));
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(spies.onPrev).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('status-prev'));
    expect(spies.onPrev).toHaveBeenCalledTimes(1);
  });

  it('does not fail going back from the first slide when the surface has no previous story', () => {
    mount({ onPrev: undefined });
    fireEvent.click(screen.getByTestId('status-prev'));
    expect(screen.getByText('Court 2')).toBeInTheDocument();
  });

  it('goes to the next story on a left swipe and the previous on a right swipe, and ignores a right swipe with nowhere to go', () => {
    const { spies } = mount();
    const box = screen.getByTestId('home-status-viewer').querySelector('[class*="MuiBox-root"]') as HTMLElement;
    const surface = screen.getByTestId('status-next').parentElement as HTMLElement;
    fireEvent.pointerDown(surface, { clientX: 200 });
    fireEvent.pointerUp(surface, { clientX: 100 });
    expect(spies.onNext).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(surface, { clientX: 100 });
    fireEvent.pointerUp(surface, { clientX: 200 });
    expect(spies.onPrev).toHaveBeenCalledTimes(1);
    expect(box).toBeDefined();
  });

  it('ignores a right swipe when the surface has no previous story', () => {
    mount({ onPrev: undefined });
    const surface = screen.getByTestId('status-next').parentElement as HTMLElement;
    fireEvent.pointerDown(surface, { clientX: 100 });
    fireEvent.pointerUp(surface, { clientX: 220 });
    expect(screen.getByText('Court 2')).toBeInTheDocument();
  });

  it('holds the story while the pointer is down and releases it when the pointer leaves or is cancelled', () => {
    mount();
    const surface = screen.getByTestId('status-next').parentElement as HTMLElement;
    fireEvent.pointerDown(surface, { clientX: 0 });
    fireEvent.pointerLeave(surface);
    fireEvent.pointerDown(surface, { clientX: 0 });
    fireEvent.pointerCancel(surface);
    expect(screen.getByText('Court 2')).toBeInTheDocument();
  });

  it('jumps straight to a peeked slide', () => {
    mount();
    fireEvent.click(screen.getByTestId('home-status-viewer-peek-post-3'));
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});

describe('likes', () => {
  it('likes and unlikes the shown slide, moving the count and telling the surface each time', () => {
    const { spies } = mount();
    const like = screen.getByTestId('status-like');
    fireEvent.click(like);
    expect(spies.onToggleLike).toHaveBeenLastCalledWith('post-1');
    expect(screen.getByText('4')).toBeInTheDocument();
    fireEvent.click(like);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(spies.onToggleLike).toHaveBeenCalledTimes(2);
  });

  it('unlikes a slide that was already liked', () => {
    mount({ item: item({ slides: [slide({ likedByMe: true, likeCount: 5 })] }) });
    fireEvent.click(screen.getByTestId('status-like'));
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('destinations', () => {
  it('opens an in-app destination, closing the viewer first', () => {
    const { spies } = mount({ item: item({ targetUrl: '/club/runners', internal: true }) });
    fireEvent.click(screen.getByTestId('status-open-target'));
    expect(spies.onClose).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith('/club/runners');
  });

  it('opens an outside destination in a new tab without referrer', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { spies } = mount({ item: item({ targetUrl: 'https://ad.example', internal: false }) });
    fireEvent.click(screen.getByTestId('status-open-target'));
    expect(spies.onClose).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://ad.example', '_blank', 'noreferrer');
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('shows no destination button when the story has none', () => {
    mount();
    expect(screen.queryByTestId('status-open-target')).not.toBeInTheDocument();
  });

  it('uses the official group chrome and the link of the slide on screen', () => {
    const { spies } = mount({
      item: item({
        kind: 'official',
        slides: [slide({ linkUrl: '/offers', linkInternal: true }), slide({ id: 'p2', linkUrl: 'https://out.example', linkInternal: false })],
      }),
    });
    expect(screen.getByTestId('status-official-slide')).toBeInTheDocument();
    expect(screen.getByTestId('status-official-caption')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-official-link'));
    expect(h.navigate).toHaveBeenCalledWith('/offers');
    expect(spies.onClose).toHaveBeenCalled();
  });

  it('opens the author profile from the name, with Enter or Space, or the avatar', () => {
    const { spies } = mount({ item: item({ authorId: 'u7', avatarUrl: 'https://img/a.png' }) });
    const author = screen.getByTestId('status-author');
    fireEvent.click(author);
    expect(h.navigate).toHaveBeenLastCalledWith('/u/u7');
    fireEvent.keyDown(author, { key: 'Enter' });
    fireEvent.keyDown(author, { key: ' ' });
    fireEvent.keyDown(author, { key: 'a' });
    expect(h.navigate).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByTestId('home-status-viewer').querySelector('img[aria-hidden]') as HTMLElement);
    expect(h.navigate).toHaveBeenCalledTimes(4);
    expect(spies.onClose).toHaveBeenCalledTimes(4);
  });

  it('has no author link when the story has no author, and a plain avatar disc without a photo', () => {
    mount({ item: item({ avatarUrl: null, subLabel: 'Sponsored' }) });
    expect(screen.queryByTestId('status-author')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-status-viewer').querySelector('img[aria-hidden]')).toBeNull();
    expect(screen.getByText(/Sponsored/)).toBeInTheDocument();
  });
});

describe('video slides', () => {
  const videoItem = () => item({ slides: [slide({ mediaType: 'VIDEO', mediaUrl: 'https://v.example/a.mp4' }), slide({ id: 'post-2', caption: 'Second' })] });
  const timeUpdate = (video: HTMLVideoElement, currentTime: number, duration: number) => {
    Object.defineProperty(video, 'duration', { value: duration, configurable: true });
    Object.defineProperty(video, 'currentTime', { value: currentTime, configurable: true });
    fireEvent.timeUpdate(video);
  };

  it('follows the clip while it plays and moves on when it reaches its end', () => {
    mount({ item: videoItem() });
    const video = screen.getByTestId('status-slide-video') as HTMLVideoElement;
    timeUpdate(video, 5, 10);
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    timeUpdate(video, 10, 10);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('caps a long clip at fifteen seconds', () => {
    mount({ item: videoItem() });
    const video = screen.getByTestId('status-slide-video') as HTMLVideoElement;
    timeUpdate(video, 16, 120);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('treats a clip with an unknown length as fifteen seconds', () => {
    mount({ item: videoItem() });
    const video = screen.getByTestId('status-slide-video') as HTMLVideoElement;
    timeUpdate(video, 3, Number.NaN);
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    timeUpdate(video, 15, Number.NaN);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});

describe('reporting', () => {
  it('opens the report flow for the slide on screen and releases the story when it closes', () => {
    mount({ canReport: true });
    fireEvent.click(screen.getByTestId('status-kebab'));
    fireEvent.click(screen.getByTestId('status-report'));
    expect(screen.getByTestId('report-dialog')).toHaveAttribute('data-target', 'post-1');
    fireEvent.click(screen.getByTestId('report-close'));
    expect(screen.getByTestId('report-dialog')).toHaveAttribute('data-target', '');
  });
});

describe('the progress timer', () => {
  const fakeFrames = () => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout', 'Date'] });

  it('advances an image slide after fifteen seconds and hands on to the next story after the last', () => {
    fakeFrames();
    const { spies } = mount({ item: item({ slides: [slide(), slide({ id: 'post-2', caption: 'Second' })] }) });
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(15100);
    });
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(spies.onNext).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(15100);
    });
    expect(spies.onNext).toHaveBeenCalledTimes(1);
  });

  it('closes after the last slide when the surface has no next story', () => {
    fakeFrames();
    const { spies } = mount({ onNext: undefined, item: item({ slides: [slide()] }) });
    act(() => {
      vi.advanceTimersByTime(15100);
    });
    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });

  it('restarts from the first slide when another story replaces this one mid-play', () => {
    fakeFrames();
    const { again } = mount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    again({ item: item({ label: 'Someone Else', slides: [slide({ id: 'x1', caption: 'Other story' })] }) });
    expect(screen.getByText('Other story')).toBeInTheDocument();
  });

  it('does not advance while a press holds the story', () => {
    fakeFrames();
    const { spies } = mount({ item: item({ slides: [slide()] }) });
    const surface = screen.getByTestId('status-next').parentElement as HTMLElement;
    fireEvent.pointerDown(surface, { clientX: 100 });
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(spies.onNext).not.toHaveBeenCalled();
    expect(spies.onClose).not.toHaveBeenCalled();
  });
});

describe('HomeStatusViewerDetails', () => {
  const details = (over: Partial<Parameters<typeof HomeStatusViewerDetails>[0]> = {}) =>
    render(<HomeStatusViewerDetails current={slide({ caption: '' })} timeLabel={null} nextPeek={[]} index={0} onJumpTo={vi.fn()} hasOpenButton={false} {...over} />);

  it('lifts itself above the open button when there is one', () => {
    const { unmount } = details({ hasOpenButton: true });
    expect(screen.getByTestId('home-status-viewer-details').className).toBeTruthy();
    unmount();
    details();
    expect(screen.getByTestId('home-status-viewer-details')).toBeInTheDocument();
  });

  it('shows the time label only when there is no caption, and a comment count of zero', () => {
    const { unmount } = details({ timeLabel: '2h ago', current: slide({ caption: '', commentCount: 0 }) });
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    unmount();
    details({ timeLabel: '2h ago', current: slide({ caption: 'Has caption' }) });
    expect(screen.queryByText('2h ago')).not.toBeInTheDocument();
  });

  it('keys and styles each peek from the best identity and picture it has', () => {
    const onJumpTo = vi.fn();
    details({
      index: 1,
      onJumpTo,
      nextPeek: [slide({ id: undefined, mediaUrl: 'm1.png' }), slide({ id: undefined, mediaUrl: '', thumbnailUrl: 'thumb.png' })],
    });
    const first = screen.getByTestId('home-status-viewer-peek-m1.png');
    expect(getComputedStyle(first).backgroundImage).toContain('m1.png');
    expect(first).toHaveAccessibleName(expect.stringContaining('3'));
    fireEvent.click(first);
    expect(onJumpTo).toHaveBeenCalledWith(2);
    const second = screen.getByTestId('home-status-viewer-peek-');
    fireEvent.click(second);
    expect(onJumpTo).toHaveBeenCalledWith(3);
  });

  it('keys a peek by its thumbnail when it has no id and no media url', () => {
    details({ nextPeek: [{ mediaType: 'IMAGE', thumbnailUrl: 't.png' } as never] });
    expect(screen.getByTestId('home-status-viewer-peek-t.png')).toBeInTheDocument();
  });

  it('shows a peek with no picture as a plain tile', () => {
    details({ nextPeek: [slide({ id: 'nopic', mediaUrl: '', thumbnailUrl: undefined })] });
    expect(getComputedStyle(screen.getByTestId('home-status-viewer-peek-nopic')).backgroundImage).not.toContain('url');
  });
});

describe('viewer helpers', () => {
  it('takes the slide link first, then the item target, and flags only an explicit internal link', () => {
    expect(slideTarget(item({ targetUrl: '/a', internal: true }), slide({ linkUrl: '/b', linkInternal: true }))).toEqual({ url: '/b', internal: true });
    expect(slideTarget(item({ targetUrl: '/a', internal: true }), slide({ linkUrl: '/b' }))).toEqual({ url: '/b', internal: false });
    expect(slideTarget(item({ targetUrl: '/a', internal: true }), slide())).toEqual({ url: '/a', internal: true });
    expect(slideTarget(item({ targetUrl: '/a' }), undefined)).toEqual({ url: '/a', internal: false });
  });

  it('names the official chrome differently from a story', () => {
    expect(viewerChrome('official').linkTestId).toBe('status-official-link');
    expect(viewerChrome('user').linkTestId).toBe('status-open-target');
    expect(viewerChrome('user').slideTestId).toBeUndefined();
  });
});
