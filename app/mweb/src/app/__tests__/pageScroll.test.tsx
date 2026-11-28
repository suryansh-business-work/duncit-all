import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scrollPageTo, shellPane, useScrollTopOnChange } from '../pageScroll';

const windowScroll = vi.fn();

beforeEach(() => {
  document.body.innerHTML = '';
  windowScroll.mockClear();
  vi.stubGlobal('scrollTo', windowScroll);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mountPane(scrollTop: number) {
  const pane = document.createElement('div');
  pane.id = 'main-scroll';
  // jsdom does no layout, so the offset is a plain writable value here.
  Object.defineProperty(pane, 'scrollTop', { configurable: true, writable: true, value: scrollTop });
  document.body.appendChild(pane);
  return pane;
}

describe('scrollPageTo', () => {
  it('moves the signed-in shell pane and the window together', () => {
    const pane = mountPane(640);
    scrollPageTo(0);
    expect(pane.scrollTop).toBe(0);
    expect(windowScroll).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls only the window when signed out (no shell pane)', () => {
    expect(shellPane()).toBeNull();
    scrollPageTo(120);
    expect(windowScroll).toHaveBeenCalledWith(0, 120);
  });
});

describe('useScrollTopOnChange', () => {
  it('leaves the page where it is on the first render', () => {
    const pane = mountPane(300);
    renderHook(() => useScrollTopOnChange('category'));
    expect(pane.scrollTop).toBe(300);
    expect(windowScroll).not.toHaveBeenCalled();
  });

  it('opens the next step at the top, and stays put while the step does not change', () => {
    const pane = mountPane(300);
    const { rerender } = renderHook(({ step }) => useScrollTopOnChange(step), {
      initialProps: { step: 'category' },
    });

    rerender({ step: 'survey' });
    expect(pane.scrollTop).toBe(0);
    expect(windowScroll).toHaveBeenCalledTimes(1);

    pane.scrollTop = 200;
    rerender({ step: 'survey' });
    expect(pane.scrollTop).toBe(200);
    expect(windowScroll).toHaveBeenCalledTimes(1);
  });
});
