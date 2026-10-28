import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCountdown } from '../../../../pages/login/sign-in/useCountdown';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Advances the clock; each render schedules the next one-second tick, so whole seconds go one at a time. */
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const seconds = (count: number) => {
  for (let i = 0; i < count; i += 1) tick(1000);
};

describe('useCountdown', () => {
  it('counts down one second at a time and stops at zero', () => {
    const { result } = renderHook(() => useCountdown(3, 'request-1'));
    expect(result.current).toBe(3);
    tick(999);
    expect(result.current).toBe(3);
    tick(1);
    expect(result.current).toBe(2);
    seconds(2);
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    seconds(3);
    expect(result.current).toBe(0);
  });

  it('starts at zero and schedules nothing when there is no cool-down', () => {
    const { result } = renderHook(() => useCountdown(0, 'request-1'));
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts from the full count when a new request arrives', () => {
    const { result, rerender } = renderHook(({ key }) => useCountdown(5, key), { initialProps: { key: { id: 1 } } });
    seconds(4);
    expect(result.current).toBe(1);
    rerender({ key: { id: 2 } });
    expect(result.current).toBe(5);
  });

  it('cancels its pending tick on unmount', () => {
    const { unmount } = renderHook(() => useCountdown(10, 'request-1'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
