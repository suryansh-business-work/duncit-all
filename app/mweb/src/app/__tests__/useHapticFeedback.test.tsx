import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHapticFeedback } from '../useHapticFeedback';

const vibrateSpy = vi.fn();

const setVibrate = (fn: unknown) => {
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: fn,
  });
};

const clickOn = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

beforeEach(() => {
  vibrateSpy.mockClear();
  vi.useRealTimers();
  document.body.innerHTML = '';
  setVibrate(vibrateSpy);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useHapticFeedback', () => {
  it('vibrates when an interactive element is clicked', () => {
    const button = document.createElement('button');
    button.textContent = 'Tap';
    document.body.appendChild(button);

    renderHook(() => useHapticFeedback(true));
    clickOn(button);

    expect(vibrateSpy).toHaveBeenCalledTimes(1);
    expect(vibrateSpy).toHaveBeenCalledWith(8);
  });

  it('vibrates for clicks on a child inside an interactive ancestor', () => {
    const link = document.createElement('a');
    link.setAttribute('href', '/x');
    const inner = document.createElement('span');
    inner.textContent = 'inner';
    link.appendChild(inner);
    document.body.appendChild(link);

    renderHook(() => useHapticFeedback(true));
    clickOn(inner);

    expect(vibrateSpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    renderHook(() => useHapticFeedback(false));
    clickOn(button);

    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('does nothing when navigator has no vibrate support', () => {
    // Remove vibrate entirely so the `'vibrate' in navigator` guard fails.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).vibrate;

    const button = document.createElement('button');
    document.body.appendChild(button);

    renderHook(() => useHapticFeedback(true));
    clickOn(button);

    // vibrate is gone; nothing to assert on the spy, but no throw = pass.
    expect('vibrate' in navigator).toBe(false);
  });

  it('ignores clicks on non-interactive areas', () => {
    const div = document.createElement('div');
    div.textContent = 'plain';
    document.body.appendChild(div);

    renderHook(() => useHapticFeedback(true));
    clickOn(div);

    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('ignores an aria-disabled interactive element', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-disabled', 'true');
    document.body.appendChild(el);

    renderHook(() => useHapticFeedback(true));
    clickOn(el);

    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('ignores a disabled button', () => {
    const button = document.createElement('button');
    button.disabled = true;
    document.body.appendChild(button);

    renderHook(() => useHapticFeedback(true));
    clickOn(button);

    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('throttles rapid successive clicks within the 90ms window', () => {
    vi.useFakeTimers();
    const nowSpy = vi.spyOn(Date, 'now');
    const button = document.createElement('button');
    document.body.appendChild(button);

    renderHook(() => useHapticFeedback(true));

    nowSpy.mockReturnValue(1000);
    clickOn(button);
    expect(vibrateSpy).toHaveBeenCalledTimes(1);

    // Only 50ms later -> suppressed.
    nowSpy.mockReturnValue(1050);
    clickOn(button);
    expect(vibrateSpy).toHaveBeenCalledTimes(1);

    // 100ms after the first -> allowed again.
    nowSpy.mockReturnValue(1100);
    clickOn(button);
    expect(vibrateSpy).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('removes the click listener on unmount', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const { unmount } = renderHook(() => useHapticFeedback(true));
    unmount();
    clickOn(button);

    expect(vibrateSpy).not.toHaveBeenCalled();
  });
});
