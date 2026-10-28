import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from '../../lib/useInstallPrompt';

/** The `beforeinstallprompt` event a Chromium browser fires when the page can be installed. */
const installEvent = (outcome: 'accepted' | 'dismissed') =>
  Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });

const fire = (event: Event) => {
  act(() => {
    globalThis.dispatchEvent(event);
  });
};

describe('useInstallPrompt', () => {
  it('offers nothing until the browser says the page can be installed', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    await expect(result.current.install()).resolves.toBe(false);
  });

  it("holds the browser's prompt (stopping the mini-infobar) and offers it", () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = installEvent('accepted');
    fire(event);
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();
  });

  it('shows the prompt on install, answers true when accepted and offers it no more', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = installEvent('accepted');
    fire(event);

    let installed = false;
    await act(async () => {
      installed = await result.current.install();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('answers false when the reader dismisses the prompt, and drops it (a prompt is single-use)', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    fire(installEvent('dismissed'));

    let installed = true;
    await act(async () => {
      installed = await result.current.install();
    });

    expect(installed).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('stops offering once the app was installed another way', () => {
    const { result } = renderHook(() => useInstallPrompt());
    fire(installEvent('accepted'));
    fire(new Event('appinstalled'));
    expect(result.current.canInstall).toBe(false);
  });

  it('stops listening when the page goes away', () => {
    const { unmount } = renderHook(() => useInstallPrompt());
    unmount();
    const event = installEvent('accepted');
    globalThis.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
