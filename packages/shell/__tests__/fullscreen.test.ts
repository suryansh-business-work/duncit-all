/**
 * Taking a call window full screen, or coming back — both directions are
 * guarded, since the API is absent on some hosts and rejects when the click
 * that asked for it has already been consumed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toggleFullscreen } from '../src/staff-chat/fullscreen';

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis.document, 'fullscreenElement', { value: null, configurable: true });
});

describe('toggleFullscreen', () => {
  it('does nothing at all with no node to act on', () => {
    expect(() => toggleFullscreen(null)).not.toThrow();
  });

  it('exits fullscreen when something is already showing full screen', () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.document, 'fullscreenElement', {
      value: document.createElement('div'),
      configurable: true,
    });
    globalThis.document.exitFullscreen = exitFullscreen;
    const node = document.createElement('div');

    toggleFullscreen(node);

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('swallows an exit that the browser refuses', async () => {
    const exitFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(globalThis.document, 'fullscreenElement', {
      value: document.createElement('div'),
      configurable: true,
    });
    globalThis.document.exitFullscreen = exitFullscreen;

    expect(() => toggleFullscreen(document.createElement('div'))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('requests fullscreen on the node when nothing is showing full screen yet', () => {
    const node = document.createElement('div');
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    node.requestFullscreen = requestFullscreen;

    toggleFullscreen(node);

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('swallows a request that the browser refuses', async () => {
    const node = document.createElement('div');
    node.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));

    expect(() => toggleFullscreen(node)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('does nothing risky on a host with no fullscreen API on the element at all', () => {
    const node = document.createElement('div');
    // jsdom does not implement requestFullscreen at all by default.
    delete (node as { requestFullscreen?: unknown }).requestFullscreen;

    expect(() => toggleFullscreen(node)).not.toThrow();
  });
});
