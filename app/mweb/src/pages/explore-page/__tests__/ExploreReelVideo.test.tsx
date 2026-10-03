import '@testing-library/jest-dom/vitest';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExploreReelVideo from '../ExploreReelVideo';

const REEL = 'https://ik.imagekit.io/esdata1/pods/reels/1000432489__1QfwnYth.mp4';

const setup = (props: Partial<Parameters<typeof ExploreReelVideo>[0]> = {}) => {
  const onSoundBlocked = vi.fn();
  const view = render(
    <ExploreReelVideo src={REEL} muted active preload onSoundBlocked={onSoundBlocked} {...props} />,
  );
  return { ...view, onSoundBlocked, video: view.container.querySelector('video') as HTMLVideoElement };
};

describe('ExploreReelVideo', () => {
  beforeEach(() => {
    vi.mocked(HTMLMediaElement.prototype.play).mockReset().mockResolvedValue(undefined);
    vi.mocked(HTMLMediaElement.prototype.pause).mockReset();
  });

  it('renders a looping, inline, muted video for the reel', () => {
    const { video } = setup();
    expect(video).toHaveAttribute('src', REEL);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video).not.toHaveAttribute('autoplay');
  });

  it('plays only while it is the reel on screen', () => {
    const { video, rerender, onSoundBlocked } = setup();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    rerender(<ExploreReelVideo src={REEL} muted active={false} preload onSoundBlocked={onSoundBlocked} />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect(video).toHaveAttribute('preload', 'auto');
  });

  it('buffers ahead only when it is near the reel on screen', () => {
    const { video } = setup({ active: false, preload: false });
    expect(video).toHaveAttribute('preload', 'none');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('unmutes when the sound is turned on', () => {
    const { video, rerender, onSoundBlocked } = setup();
    rerender(<ExploreReelVideo src={REEL} muted={false} active preload onSoundBlocked={onSoundBlocked} />);
    expect(video.muted).toBe(false);
  });

  it('carries on muted when the browser refuses to play it with sound', async () => {
    vi.mocked(HTMLMediaElement.prototype.play)
      .mockRejectedValueOnce(new DOMException('needs a tap', 'NotAllowedError'))
      .mockRejectedValueOnce(new DOMException('still no', 'AbortError'));
    const { video, onSoundBlocked } = setup({ muted: false });
    await waitFor(() => expect(onSoundBlocked).toHaveBeenCalledTimes(1));
    expect(video.muted).toBe(true);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2));
  });

  it('records any other refused play without touching the sound', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('paused by a swipe', 'AbortError'),
    );
    const { video, onSoundBlocked } = setup({ muted: false });
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(onSoundBlocked).not.toHaveBeenCalled();
    expect(video.muted).toBe(false);
  });

  it('applies full-bleed cover styling', () => {
    const { video } = setup();
    expect(video).toHaveStyle({ objectFit: 'cover', width: '100%', height: '100%' });
  });
});
