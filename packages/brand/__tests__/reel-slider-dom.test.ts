// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountReelSlider } from '../src/reel-slider-dom';
import type { ReelSliderCopy, SiteReel } from '../src/reel-slider';

const copy: ReelSliderCopy = {
  slide: 'Reel {current} of {total}',
  previous: 'Previous',
  next: 'Next',
  play: 'Play',
  pause: 'Pause',
  mute: 'Mute',
  unmute: 'Unmute',
  goTo: 'Go to reel {index}',
};

const makeReels = (n: number): SiteReel[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    title: `Title ${i}`,
    description: `Desc ${i}`,
    video_url: `https://v.test/${i}.mp4`,
  }));

let observerCallback: (entries: Array<{ isIntersecting: boolean } | undefined>) => void;
let observerDisconnect: ReturnType<typeof vi.fn>;
let playBehaviour: () => Promise<void>;
let reduced: boolean;

function stubEnvironment() {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  observerDisconnect = vi.fn();
  class FakeObserver {
    constructor(cb: typeof observerCallback) {
      observerCallback = cb;
    }
    observe() {}
    disconnect = observerDisconnect;
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get() {
      return (this as { __paused?: boolean }).__paused ?? true;
    },
  });
  HTMLMediaElement.prototype.play = vi.fn(function (this: { __paused?: boolean }) {
    this.__paused = false;
    return playBehaviour();
  });
  HTMLMediaElement.prototype.pause = vi.fn(function (this: { __paused?: boolean }) {
    this.__paused = true;
  });
}

function markup(opts: { live?: boolean } = {}): HTMLElement {
  const { live = true } = opts;
  document.body.innerHTML = `<section id="root">
    <button data-reel-prev><i></i></button><button data-reel-next><i></i></button>
    <div data-reel-stage></div><div data-reel-dots></div>${live ? '<p data-reel-live></p>' : ''}
  </section>`;
  return document.getElementById('root') as HTMLElement;
}

const cards = () => [...document.querySelectorAll<HTMLElement>('.reel-card')];
const videos = () => [...document.querySelectorAll<HTMLVideoElement>('video')];
const dots = () => [...document.querySelectorAll<HTMLButtonElement>('.reel-dot')];
const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const activeIndex = () => cards().findIndex((c) => c.dataset.state === 'active');
const intersect = (isIntersecting = true) => observerCallback([{ isIntersecting }]);
const playCalls = () => (HTMLMediaElement.prototype.play as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

beforeEach(() => {
  reduced = false;
  playBehaviour = () => Promise.resolve();
  stubEnvironment();
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('mountReelSlider setup', () => {
  it('returns a no-op when required elements are missing or there are no reels', () => {
    document.body.innerHTML = '<section id="root"></section>';
    const root = document.getElementById('root') as HTMLElement;
    expect(mountReelSlider(root, makeReels(2), copy)()).toBeUndefined();
    const full = markup();
    const teardown = mountReelSlider(full, [], copy);
    expect(teardown()).toBeUndefined();
    expect(cards()).toHaveLength(0);
  });

  it('builds a card and a dot per reel with accessible labels', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    expect(cards()).toHaveLength(3);
    expect(dots().map((d) => d.getAttribute('aria-label'))).toEqual(['Go to reel 1', 'Go to reel 2', 'Go to reel 3']);
    expect(cards()[0].getAttribute('aria-label')).toBe('Reel 1 of 3');
    expect(cards()[0].getAttribute('aria-roledescription')).toBe('slide');
    expect(q('[data-reel-prev]').getAttribute('aria-label')).toBe('Previous');
    expect(q('[data-reel-next]').title).toBe('Next');
  });

  it('configures each video muted, looping, lazy and with a poster', () => {
    mountReelSlider(markup(), makeReels(2), copy);
    const [first] = videos();
    expect(first.muted).toBe(true);
    expect(first.loop).toBe(true);
    expect(first.dataset.src).toBe('https://v.test/0.mp4');
    expect(first.poster).toBe('https://v.test/0.mp4/ik-thumbnail.jpg');
    expect(first.getAttribute('aria-label')).toBe('Title 0');
  });

  it('renders titles and descriptions only when present', () => {
    mountReelSlider(markup(), [{ id: 'x', title: '', description: '', video_url: '' }], copy);
    expect(document.querySelector('.reel-title')).toBeNull();
    expect(document.querySelector('.reel-description')).toBeNull();
    const [video] = videos();
    expect(video.hasAttribute('aria-label')).toBe(false);
    expect(video.getAttribute('poster')).toBe('');
    intersect();
    expect(video.src).toBe('');
  });

  it('marks the active card, near neighbours and far cards, hiding far ones from focus', () => {
    mountReelSlider(markup(), makeReels(7), copy);
    const states = cards().map((c) => c.dataset.state);
    expect(states).toEqual(['active', 'side', 'side', 'away', 'away', 'side', 'side']);
    expect(cards()[0].getAttribute('aria-hidden')).toBe('false');
    expect(cards()[1].getAttribute('aria-hidden')).toBe('true');
    expect(cards()[3].hasAttribute('inert')).toBe(true);
    expect(cards()[2].hasAttribute('inert')).toBe(false);
    expect(cards()[1].style.getPropertyValue('--offset')).toBe('1');
    expect(cards()[6].style.getPropertyValue('--offset')).toBe('-1');
  });

  it('only the active card keeps tabbable controls and the first dot is current', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    const buttons = (i: number) => cards()[i].querySelectorAll<HTMLButtonElement>('button');
    expect([...buttons(0)].map((b) => b.tabIndex)).toEqual([0, 0]);
    expect([...buttons(1)].map((b) => b.tabIndex)).toEqual([-1, -1]);
    expect(dots()[0].hasAttribute('aria-current')).toBe(true);
    expect(dots()[1].hasAttribute('aria-current')).toBe(false);
  });

  it('hides the arrows and dots for a single reel', () => {
    mountReelSlider(markup(), makeReels(1), copy);
    expect((q('[data-reel-prev]') as HTMLButtonElement).hidden).toBe(true);
    expect((q('[data-reel-next]') as HTMLButtonElement).hidden).toBe(true);
    expect(q('[data-reel-dots]').hidden).toBe(true);
  });
});

describe('playback', () => {
  it('plays nothing until the section is in view, then plays the active and neighbours', () => {
    mountReelSlider(markup(), makeReels(5), copy);
    expect(playCalls()).toBe(0);
    intersect(true);
    const playing = videos().map((v) => !v.paused);
    expect(playing).toEqual([true, true, true, true, true]);
    expect(videos()[0].src).toBe('https://v.test/0.mp4');
  });

  it('does not load or play reels further than the visible distance', () => {
    mountReelSlider(markup(), makeReels(7), copy);
    intersect();
    expect(videos()[3].src).toBe('');
    expect(videos()[3].paused).toBe(true);
    expect(videos()[3].preload).toBe('none');
    expect(videos()[0].preload).toBe('auto');
  });

  it('pauses everything when the section scrolls out of view', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    intersect(true);
    intersect(false);
    expect(videos().every((v) => v.paused)).toBe(true);
  });

  it('treats an empty observer entry as off screen', () => {
    mountReelSlider(markup(), makeReels(2), copy);
    intersect(true);
    observerCallback([undefined]);
    expect(videos().every((v) => v.paused)).toBe(true);
  });

  it('pauses when the tab is hidden and resumes when it is visible again', () => {
    mountReelSlider(markup(), makeReels(2), copy);
    intersect(true);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(videos().every((v) => v.paused)).toBe(true);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(videos()[0].paused).toBe(false);
  });

  it('the play button pauses the active reel only and flips its label', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    intersect();
    const playButton = cards()[0].querySelector('.reel-play') as HTMLButtonElement;
    expect(playButton.getAttribute('aria-label')).toBe('Pause');
    playButton.click();
    expect(videos()[0].paused).toBe(true);
    expect(videos()[1].paused).toBe(false);
    expect(playButton.getAttribute('aria-label')).toBe('Play');
    expect(playButton.querySelector('i')?.className).toContain('fa-play');
    playButton.click();
    expect(videos()[0].paused).toBe(false);
    expect(playButton.querySelector('i')?.className).toContain('fa-pause');
  });

  it('updates the progress bar from timeupdate and ignores an unknown duration', () => {
    mountReelSlider(markup(), makeReels(1), copy);
    const video = videos()[0];
    const bar = q('.reel-progress-bar');
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 5 });
    Object.defineProperty(video, 'duration', { configurable: true, value: 20 });
    video.dispatchEvent(new Event('timeupdate'));
    expect(bar.style.transform).toBe('scaleX(0.25)');
    Object.defineProperty(video, 'duration', { configurable: true, value: 0 });
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 9 });
    video.dispatchEvent(new Event('timeupdate'));
    expect(bar.style.transform).toBe('scaleX(0.25)');
  });
});

describe('sound', () => {
  it('turns sound on for the active reel only and unpauses it', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    intersect();
    const play0 = cards()[0].querySelector('.reel-play') as HTMLButtonElement;
    const sound0 = cards()[0].querySelector('.reel-sound') as HTMLButtonElement;
    play0.click();
    sound0.click();
    expect(videos()[0].muted).toBe(false);
    expect(videos()[1].muted).toBe(true);
    expect(sound0.getAttribute('aria-pressed')).toBe('true');
    expect(sound0.getAttribute('aria-label')).toBe('Mute');
    expect(videos()[0].paused).toBe(false);
    sound0.click();
    expect(videos()[0].muted).toBe(true);
    expect(sound0.getAttribute('aria-pressed')).toBe('false');
    expect(sound0.getAttribute('aria-label')).toBe('Unmute');
  });

  it('keeps one reel with sound: it follows the visitor and the old one mutes', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    intersect();
    (cards()[0].querySelector('.reel-sound') as HTMLButtonElement).click();
    (q('[data-reel-next]') as HTMLButtonElement).click();
    expect(videos()[0].muted).toBe(true);
    expect(videos()[1].muted).toBe(false);
  });

  it('falls back to muted when the browser refuses to play with sound', async () => {
    mountReelSlider(markup(), makeReels(2), copy);
    intersect();
    playBehaviour = () => Promise.reject(new Error('NotAllowedError'));
    videos()[0].pause();
    (cards()[0].querySelector('.reel-sound') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
    expect(videos()[0].muted).toBe(true);
    expect(cards()[0].querySelector('.reel-sound')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('leaves state alone when a muted play is refused', async () => {
    playBehaviour = () => Promise.reject(new Error('blocked'));
    mountReelSlider(markup(), makeReels(1), copy);
    intersect();
    await Promise.resolve();
    await Promise.resolve();
    expect(videos()[0].muted).toBe(true);
  });
});

describe('navigation', () => {
  it('next and previous step around the circle', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    (q('[data-reel-prev]') as HTMLButtonElement).click();
    expect(activeIndex()).toBe(2);
    (q('[data-reel-next]') as HTMLButtonElement).click();
    expect(activeIndex()).toBe(0);
    expect(q('[data-reel-live]').textContent).toBe('Reel 1 of 3');
  });

  it('a dot or a side card jumps to that reel; the active card click does nothing', () => {
    mountReelSlider(markup(), makeReels(5), copy);
    dots()[2].click();
    expect(activeIndex()).toBe(2);
    expect(q('[data-reel-live]').textContent).toBe('Reel 3 of 5');
    cards()[3].click();
    expect(activeIndex()).toBe(3);
    q('[data-reel-live]').textContent = 'unchanged';
    cards()[3].click();
    dots()[3].click();
    expect(q('[data-reel-live]').textContent).toBe('unchanged');
  });

  it('arrow keys move the slider and other keys do not', () => {
    const root = markup();
    mountReelSlider(root, makeReels(3), copy);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(activeIndex()).toBe(1);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(activeIndex()).toBe(0);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(activeIndex()).toBe(0);
  });

  it('swipes: left advances, right goes back, small drags and stray ups are ignored', () => {
    mountReelSlider(markup(), makeReels(3), copy);
    const stage = q('[data-reel-stage]');
    const down = (x: number) => stage.dispatchEvent(new MouseEvent('pointerdown', { clientX: x }));
    const up = (x: number) => stage.dispatchEvent(new MouseEvent('pointerup', { clientX: x }));
    up(0);
    expect(activeIndex()).toBe(0);
    down(200);
    up(100);
    expect(activeIndex()).toBe(1);
    down(100);
    up(200);
    expect(activeIndex()).toBe(0);
    down(100);
    up(120);
    expect(activeIndex()).toBe(0);
    down(100);
    up(140);
    expect(activeIndex()).toBe(2);
  });

  it('works without a live region', () => {
    mountReelSlider(markup({ live: false }), makeReels(2), copy);
    (q('[data-reel-next]') as HTMLButtonElement).click();
    expect(activeIndex()).toBe(1);
  });
});

describe('reduced motion', () => {
  it('starts paused, plays only the active reel on request and stills the new one on navigation', () => {
    reduced = true;
    mountReelSlider(markup(), makeReels(3), copy);
    intersect();
    expect(videos().every((v) => v.paused)).toBe(true);
    const playButton = cards()[0].querySelector('.reel-play') as HTMLButtonElement;
    expect(playButton.getAttribute('aria-label')).toBe('Play');
    playButton.click();
    expect(videos()[0].paused).toBe(false);
    expect(videos()[1].paused).toBe(true);
    (q('[data-reel-next]') as HTMLButtonElement).click();
    expect(videos()[0].paused).toBe(true);
    expect(videos()[1].paused).toBe(true);
  });
});

describe('teardown', () => {
  it('disconnects the observer, stops listening and pauses every video', () => {
    const teardown = mountReelSlider(markup(), makeReels(2), copy);
    intersect();
    teardown();
    expect(observerDisconnect).toHaveBeenCalledTimes(1);
    expect(videos().every((v) => v.paused)).toBe(true);
    const before = playCalls();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(playCalls()).toBe(before);
  });
});
