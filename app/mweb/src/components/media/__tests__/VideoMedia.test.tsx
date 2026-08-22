/**
 * The inline video tile: autoplaying, muted, looping, with its own controls.
 *
 * Muted is not a preference here, it is what makes autoplay legal — every
 * browser blocks a video that starts with sound, so a tile that mounted unmuted
 * would simply not play. The mute toggle therefore reads the ELEMENT rather
 * than a piece of React state: the video is the truth, and a button whose icon
 * disagrees with what the viewer is hearing is worse than no button.
 *
 * `showToggles` exists because the same tile is used where controls would be
 * noise — a background hero, a card thumbnail — so it must render cleanly with
 * nothing on top of it.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import VideoMedia from '../VideoMedia';

const testTheme = createTheme();

let paused = false;

beforeAll(() => {
  Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get: () => paused,
  });
  globalThis.HTMLMediaElement.prototype.play = vi.fn(() => {
    paused = false;
    return Promise.resolve();
  });
  globalThis.HTMLMediaElement.prototype.pause = vi.fn(() => {
    paused = true;
  });
});

const tile = (over: Partial<Parameters<typeof VideoMedia>[0]> = {}) =>
  render(
    <ThemeProvider theme={testTheme}>
      <VideoMedia src="https://cdn.duncit.com/court.mp4" {...over} />
    </ThemeProvider>
  );

afterEach(() => {
  paused = false;
  vi.clearAllMocks();
});

describe('VideoMedia', () => {
  it('renders the video it was given', () => {
    const { container } = tile();
    const video = container.querySelector('video');

    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://cdn.duncit.com/court.mp4');
  });

  it('starts muted and looping, which is what makes autoplay legal at all', () => {
    const video = tile().container.querySelector('video') as HTMLVideoElement;

    expect(video.muted).toBe(true);
    expect(video.hasAttribute('loop')).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(true);
  });

  it('plays inline rather than taking over the screen on a phone', () => {
    const video = tile().container.querySelector('video') as HTMLVideoElement;

    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('shows a poster while the video is still loading, when one was given', () => {
    const video = tile({ poster: 'https://cdn.duncit.com/court.jpg' }).container.querySelector(
      'video'
    ) as HTMLVideoElement;

    expect(video.getAttribute('poster')).toBe('https://cdn.duncit.com/court.jpg');
  });

  it('pauses and plays again, and says which one the button will do next', () => {
    const { container } = tile();
    const pause = container.querySelector('[aria-label="Pause video"]') as HTMLElement;

    fireEvent.click(pause);
    expect(container.querySelector('[aria-label="Play video"]')).not.toBeNull();

    fireEvent.click(container.querySelector('[aria-label="Play video"]') as HTMLElement);
    expect(container.querySelector('[aria-label="Pause video"]')).not.toBeNull();
  });

  it('takes the mute state from the ELEMENT, so the icon cannot disagree with the sound', () => {
    const { container } = tile();
    const video = container.querySelector('video') as HTMLVideoElement;
    const [, unmute] = container.querySelectorAll<HTMLElement>('button');

    fireEvent.click(unmute);

    expect(video.muted).toBe(false);
  });

  it('mutes again on a second press', () => {
    const { container } = tile();
    const video = container.querySelector('video') as HTMLVideoElement;
    const [, mute] = container.querySelectorAll<HTMLElement>('button');

    fireEvent.click(mute);
    fireEvent.click(container.querySelectorAll<HTMLElement>('button')[1] as HTMLElement);

    expect(video.muted).toBe(true);
  });

  it('renders with no controls where they would be noise', () => {
    const { container } = tile({ showToggles: false });

    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('takes a fixed height as well as the responsive default', () => {
    expect(tile({ height: 300 }).container.querySelector('video')).not.toBeNull();
    expect(tile({ height: { xs: 180, md: 420 } }).container.querySelector('video')).not.toBeNull();
  });

  it('survives a play the browser refused — autoplay is blocked more often than not', () => {
    globalThis.HTMLMediaElement.prototype.play = vi.fn(() => Promise.reject(new Error('blocked')));
    const { container } = tile();
    paused = true;

    fireEvent.click(container.querySelectorAll<HTMLElement>('button')[0] as HTMLElement);

    expect(container.querySelector('video')).not.toBeNull();
  });
});
