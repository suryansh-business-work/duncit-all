import { afterEach, describe, expect, it, vi } from 'vitest';
import { playMessagePing } from '../src/sounds';

describe('playMessagePing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the bundled ping at a gentle volume', () => {
    const play = vi.fn(() => Promise.resolve());
    const created: { src: string; volume: number }[] = [];
    vi.stubGlobal(
      'Audio',
      vi.fn(function (this: { src: string; volume: number; play: typeof play }, src: string) {
        this.src = src;
        this.volume = 1;
        this.play = play;
        created.push(this);
      }),
    );
    playMessagePing();
    expect(play).toHaveBeenCalledTimes(1);
    expect(created[0].src).toContain('chat-ping-new-message');
    expect(created[0].volume).toBe(0.6);
  });

  it('swallows a blocked autoplay instead of rejecting', async () => {
    const play = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    vi.stubGlobal(
      'Audio',
      vi.fn(function (this: { play: typeof play }) {
        this.play = play;
      }),
    );
    expect(() => playMessagePing()).not.toThrow();
    await Promise.resolve();
    expect(play).toHaveBeenCalled();
  });

  it('does nothing when the browser has no Audio at all', () => {
    vi.stubGlobal(
      'Audio',
      vi.fn(() => {
        throw new Error('no audio');
      }),
    );
    expect(() => playMessagePing()).not.toThrow();
  });
});
