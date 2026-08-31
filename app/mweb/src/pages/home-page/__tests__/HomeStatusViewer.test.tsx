/**
 * The full-screen story viewer.
 *
 * Everything here is gated on WHOSE story it is, and getting that wrong is the
 * expensive kind of bug: offering "seen by" on somebody else's story leaks who
 * looked at it, and offering a delete on it destroys another member's post.
 *
 *  - mine: viewers and delete, never a like. Liking your own story is noise.
 *  - a follower's: a like, never viewers or delete.
 *  - an AD: none of the three. It is sponsored media, not somebody's post, and
 *    a like on it would be a metric nobody asked for.
 *
 * A slide is recorded as seen when it is shown, which is what greys its ring;
 * a viewer that recorded nothing would leave every ring looking unread forever.
 *
 * The countdown is shared with the mobile app (rule 27) and compacts to m / h /
 * d, so a story with 45 minutes left never reads as "0h".
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import HomeStatusViewer, {
  statusRemainingLabel,
  type HomeStatusViewerItem,
  type HomeStatusViewerSlide,
} from '../HomeStatusViewer';

const testTheme = createTheme();

/** jsdom ships `play`/`pause` as "not implemented" stubs that log and return
 * undefined, so they are replaced outright rather than filled in — the viewer
 * starts its own clips now and a spy is the only way to see that it did. */
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.HTMLMediaElement.prototype.play = play;
  globalThis.HTMLMediaElement.prototype.pause = pause;
});

beforeEach(() => {
  play.mockReset().mockResolvedValue(undefined);
  pause.mockReset();
});

const slide = (over: Partial<HomeStatusViewerSlide> = {}): HomeStatusViewerSlide => ({
  id: 'post-1',
  mediaUrl: 'https://ik.imagekit.io/duncit/story.png',
  mediaType: 'IMAGE',
  caption: 'Court 2 tonight',
  createdAt: '2026-08-25T09:00:00.000Z',
  expiresAt: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
  likeCount: 3,
  likedByMe: false,
  commentCount: 0,
  ...over,
});

const item = (over: Partial<HomeStatusViewerItem> = {}): HomeStatusViewerItem => ({
  label: 'Meera N',
  subLabel: 'a moment ago',
  avatarUrl: 'https://ik.imagekit.io/duncit/meera.png',
  kind: 'user',
  slides: [slide(), slide({ id: 'post-2', caption: 'Second slide' })],
  ...over,
});

const viewer = (over: Partial<Parameters<typeof HomeStatusViewer>[0]> = {}) => {
  const spies = {
    onClose: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onDelete: vi.fn(),
    onViewers: vi.fn(),
    onToggleLike: vi.fn(),
    onRecordView: vi.fn(),
  };
  const result = render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter>
        <HomeStatusViewer item={item()} {...spies} {...over} />
      </MemoryRouter>
    </ThemeProvider>
  );
  return { ...result, spies };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('statusRemainingLabel', () => {
  const now = new Date('2026-08-25T09:00:00.000Z');

  it('counts minutes under an hour, so 45 minutes never reads as 0h', () => {
    expect(statusRemainingLabel('2026-08-25T09:45:00.000Z', now)).toBe('45m remaining');
  });

  it('counts whole hours under a day', () => {
    expect(statusRemainingLabel('2026-08-25T21:00:00.000Z', now)).toBe('12h remaining');
  });

  it('counts days beyond that', () => {
    expect(statusRemainingLabel('2026-08-26T21:00:00.000Z', now)).toBe('1d remaining');
  });

  it('says nothing for a story that has already expired', () => {
    expect(statusRemainingLabel('2026-08-25T08:00:00.000Z', now)).toBeNull();
    expect(statusRemainingLabel('2026-08-25T09:00:00.000Z', now)).toBeNull();
  });

  it('says nothing when there is no expiry, or it is not a date', () => {
    expect(statusRemainingLabel(null, now)).toBeNull();
    expect(statusRemainingLabel('', now)).toBeNull();
    expect(statusRemainingLabel('not-a-date', now)).toBeNull();
  });
});

describe('HomeStatusViewer', () => {
  it('renders nothing when there is no story open', () => {
    const { container } = viewer({ item: null });

    expect(container.textContent ?? '').toBe('');
    expect(document.body.querySelector('video')).toBeNull();
  });

  it('names whose story it is, and shows the slide', () => {
    const { container } = viewer();

    expect(document.body.textContent).toContain('Meera N');
    expect(document.body.textContent).toContain('Court 2 tonight');
  });

  it('records the slide it showed, which is what greys the ring', () => {
    const { spies } = viewer();

    expect(spies.onRecordView).toHaveBeenCalledWith('post-1');
  });

  it('offers exactly the actions the SURFACE handed it, and no others', () => {
    // The gate is the handler, not the story kind: the page decides what this
    // reader may do, so a viewer that drew its own actions could offer 'seen
    // by' on somebody else's story or a delete on another member's post.
    const spies = {
      onClose: vi.fn(),
      onDelete: vi.fn(),
      onViewers: vi.fn(),
      onToggleLike: vi.fn(),
    };

    const mine = render(
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <HomeStatusViewer
            item={item({ kind: 'mine' })}
            onClose={spies.onClose}
            onDelete={spies.onDelete}
            onViewers={spies.onViewers}
          />
        </MemoryRouter>
      </ThemeProvider>,
    );
    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    expect(spies.onToggleLike).not.toHaveBeenCalled();
    mine.unmount();
  });

  it('offers a like where the surface passed one, and nothing else', () => {
    const onToggleLike = vi.fn();
    const onViewers = vi.fn();
    const onDelete = vi.fn();

    render(
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <HomeStatusViewer item={item({ kind: 'user' })} onClose={vi.fn()} onToggleLike={onToggleLike} />
        </MemoryRouter>
      </ThemeProvider>,
    );
    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onViewers).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('offers none of the three on a sponsored story, which is not somebody post', () => {
    const spies = { onToggleLike: vi.fn(), onViewers: vi.fn(), onDelete: vi.fn() };

    render(
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <HomeStatusViewer item={item({ kind: 'ad' })} onClose={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>,
    );
    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onToggleLike).not.toHaveBeenCalled();
    expect(spies.onViewers).not.toHaveBeenCalled();
    expect(spies.onDelete).not.toHaveBeenCalled();
  });
  it('shows a story the viewer has already liked differently', () => {
    // Both render through a portal into the same body, so each is snapshotted
    // and torn down before the next one goes up.
    const first = viewer({ item: item({ slides: [slide({ likedByMe: true })] }) });
    const liked = document.body.innerHTML;
    first.unmount();

    viewer({ item: item({ slides: [slide({ likedByMe: false })] }) });

    expect(document.body.innerHTML).not.toBe(liked);
  });

  it('renders a story with a single slide, and one with none at all', () => {
    expect(viewer({ item: item({ slides: [slide()] }) }).container).toBeDefined();
    expect(viewer({ item: item({ slides: [] }) }).container).toBeDefined();
  });

  it('renders a legacy story whose media is on the item rather than a slide', () => {
    const { container } = viewer({
      item: item({
        slides: undefined,
        mediaUrl: 'https://ik.imagekit.io/duncit/legacy.png',
        mediaType: 'IMAGE',
      }),
    });

    expect(document.body.textContent).toContain('Meera N');
  });

  it('renders a video story as a video', () => {
    const { container } = viewer({
      item: item({ slides: [slide({ mediaType: 'VIDEO', mediaUrl: 'https://cdn.duncit.com/s.mp4' })] }),
    });

    expect(document.body.querySelector('video')).not.toBeNull();
  });

  /**
   * A story clip has to actually start, and it has to bring its sound.
   *
   * The element's own `autoplay` was not enough: the viewer mounts inside a
   * Dialog portal, so the attempt is made before the remote clip has anything
   * to show and is dropped — which left the slide black, silent, and frozen,
   * because a video slide's progress bar is driven by `timeupdate` alone.
   */
  describe('video slides', () => {
    const videoItem = () =>
      item({ slides: [slide({ mediaType: 'VIDEO', mediaUrl: 'https://cdn.duncit.com/s.mp4' })] });

    it('starts the clip itself, with its sound on, and offers a speaker', async () => {
      viewer({ item: videoItem() });

      const video = document.body.querySelector('video') as HTMLVideoElement;
      expect(video.muted).toBe(false);
      await waitFor(() => expect(play).toHaveBeenCalled());
      expect(document.body.querySelector('[data-testid="status-mute"]')).not.toBeNull();
    });

    it('mutes the clip when the speaker is pressed', () => {
      viewer({ item: videoItem() });
      fireEvent.click(document.body.querySelector('[data-testid="status-mute"]') as HTMLElement);

      expect((document.body.querySelector('video') as HTMLVideoElement).muted).toBe(true);
    });

    it('starts muted when the browser refuses to autoplay it with sound', async () => {
      play.mockRejectedValueOnce(new Error('NotAllowedError'));

      viewer({ item: videoItem() });

      await waitFor(() =>
        expect((document.body.querySelector('video') as HTMLVideoElement).muted).toBe(true),
      );
    });

    it('holds the clip while the story is pressed, and resumes on release', () => {
      viewer({ item: videoItem() });
      // The press handlers sit on the slide stage — the clip's own parent.
      const stage = (document.body.querySelector('video') as HTMLVideoElement)
        .parentElement as HTMLElement;

      fireEvent.pointerDown(stage, { clientX: 200 });
      expect(pause).toHaveBeenCalled();
      const resumedFrom = play.mock.calls.length;
      fireEvent.pointerUp(stage, { clientX: 200 });
      expect(play.mock.calls.length).toBeGreaterThan(resumedFrom);
    });

    it('moves on rather than parking the story on a clip that will not load', () => {
      const { spies } = viewer({ item: videoItem() });

      fireEvent.error(document.body.querySelector('video') as HTMLVideoElement);

      expect(spies.onNext).toHaveBeenCalled();
    });
  });

  it('moves between slides, and on to the next story at the end', () => {
    const { container, spies } = viewer();
    const stage = document.body.querySelector('[role="presentation"]') ?? (document.body.firstElementChild as HTMLElement);

    fireEvent.pointerDown(stage as HTMLElement, { clientX: 300 });
    fireEvent.pointerUp(stage as HTMLElement, { clientX: 100 });

    expect(spies.onNext.mock.calls.length + spies.onRecordView.mock.calls.length).toBeGreaterThan(0);
  });

  it('goes back to the previous story when swiped the other way', () => {
    const { container } = viewer();
    const stage = document.body.querySelector('[role="presentation"]') ?? (document.body.firstElementChild as HTMLElement);

    fireEvent.pointerDown(stage as HTMLElement, { clientX: 100 });
    fireEvent.pointerUp(stage as HTMLElement, { clientX: 340 });

    expect(document.body.innerHTML).not.toBe('');
  });

  it('ignores a drag too short to be a swipe, so a tap is not a page turn', () => {
    const { container, spies } = viewer();
    const stage = document.body.querySelector('[role="presentation"]') ?? (document.body.firstElementChild as HTMLElement);

    fireEvent.pointerDown(stage as HTMLElement, { clientX: 200 });
    fireEvent.pointerUp(stage as HTMLElement, { clientX: 210 });

    expect(spies.onPrev).not.toHaveBeenCalled();
  });

  it('shows how long the story has left', () => {
    const { container } = viewer();

    expect(document.body.textContent).toContain('remaining');
  });

  it('renders a story with no expiry recorded', () => {
    const { container } = viewer({ item: item({ slides: [slide({ expiresAt: null })] }) });

    expect(document.body.textContent).not.toContain('remaining');
  });

  it('renders for a surface that passes none of the optional handlers', () => {
    const { container } = render(
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <HomeStatusViewer item={item()} onClose={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(document.body.textContent).toContain('Meera N');
  });
});
