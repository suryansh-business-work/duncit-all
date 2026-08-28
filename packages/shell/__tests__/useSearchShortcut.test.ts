/**
 * Ctrl/Cmd+K opens the docked search, Escape closes it — both on the window,
 * so the shortcut works before the panel has ever been clicked into.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSearchShortcut } from '../src/staff-chat/useSearchShortcut';

const press = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
  globalThis.dispatchEvent(event);
  return event;
};

describe('useSearchShortcut', () => {
  it('opens on Ctrl+K, swallowing the browser\'s own shortcut', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, vi.fn()));

    const event = press({ key: 'k', ctrlKey: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('opens on Cmd+K too, for a Mac keyboard', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, vi.fn()));

    press({ key: 'K', metaKey: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderHook(() => useSearchShortcut(vi.fn(), onClose));

    press({ key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a plain key with neither modifier nor Escape', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, onClose));

    press({ key: 'k' });

    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const onOpen = vi.fn();
    const { unmount } = renderHook(() => useSearchShortcut(onOpen, vi.fn()));
    unmount();

    press({ key: 'k', ctrlKey: true });

    expect(onOpen).not.toHaveBeenCalled();
  });
});
