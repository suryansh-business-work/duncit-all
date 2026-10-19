import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useScrollUpHistory } from '../useScrollUpHistory';

describe('useScrollUpHistory', () => {
  it('does nothing when the room has no older page', async () => {
    const loadOlder = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useScrollUpHistory({ scrollRef: { current: null }, oldestId: 'a', canLoadOlder: false, loadOlder }),
    );
    await act(() => result.current.showOlder());
    expect(loadOlder).not.toHaveBeenCalled();
    expect(result.current.loadingOlder).toBe(false);
  });

  it('still loads from the control before the log is mounted, with nothing to anchor', async () => {
    const loadOlder = vi.fn(() => Promise.resolve());
    const { result, rerender } = renderHook(
      ({ oldestId }) => useScrollUpHistory({ scrollRef: { current: null }, oldestId, canLoadOlder: true, loadOlder }),
      { initialProps: { oldestId: 'b' } },
    );
    // A scroll with no log measures nothing and asks nothing.
    act(() => result.current.onScrollNearTop());
    expect(loadOlder).not.toHaveBeenCalled();
    await act(() => result.current.showOlder());
    rerender({ oldestId: 'a' });
    expect(loadOlder).toHaveBeenCalledTimes(1);
    expect(result.current.olderFailed).toBe(false);
  });

  it('anchors the reader only after its own load, not when the oldest line changes otherwise', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: 300 });
    const { rerender } = renderHook(
      ({ oldestId }) =>
        useScrollUpHistory({ scrollRef: { current: el }, oldestId, canLoadOlder: true, loadOlder: () => Promise.resolve() }),
      { initialProps: { oldestId: 'b' } },
    );
    rerender({ oldestId: 'a' });
    expect(el.scrollTop).toBe(300);
  });
});
