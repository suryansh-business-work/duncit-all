import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { clampRect, FRAME, initialRect, useFloatingFrame } from '@/components/call-window/useFloatingFrame';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(globalThis, 'innerHeight', { configurable: true, value: height });
};

const pointer = (x: number, y: number, target: Element = document.body) =>
  ({ clientX: x, clientY: y, target }) as unknown as React.PointerEvent;
const key = (k: string, shiftKey = false) => {
  const el = document.createElement('div');
  return { key: k, shiftKey, target: el, currentTarget: el, preventDefault: () => undefined } as unknown as React.KeyboardEvent;
};
const move = (x: number, y: number) => act(() => void globalThis.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y })));
const release = () => act(() => void globalThis.dispatchEvent(new MouseEvent('pointerup')));

beforeEach(() => setViewport(1280, 800));
afterEach(() => setViewport(1024, 768));

describe('clampRect', () => {
  it('keeps the window inside the viewport with a gutter', () => {
    expect(clampRect({ x: -50, y: -50, w: 400, h: 500 }, 1280, 800)).toEqual({ x: 16, y: 16, w: 400, h: 500 });
    expect(clampRect({ x: 5000, y: 5000, w: 400, h: 500 }, 1280, 800)).toEqual({ x: 864, y: 284, w: 400, h: 500 });
  });

  it('never shrinks below the minimum size, nor grows past the screen', () => {
    expect(clampRect({ x: 16, y: 16, w: 10, h: 10 }, 1280, 800)).toMatchObject({ w: FRAME.minW, h: FRAME.minH });
    expect(clampRect({ x: 16, y: 16, w: 4000, h: 4000 }, 1280, 800)).toMatchObject({ w: 1248, h: 768 });
  });

  it('fits a phone screen edge to edge inside the gutter', () => {
    expect(clampRect({ x: 0, y: 0, w: 420, h: 600 }, 360, 640)).toEqual({ x: 16, y: 16, w: 328, h: 600 });
  });

  it('copes with a viewport smaller than the gutters', () => {
    expect(clampRect({ x: 0, y: 0, w: 420, h: 600 }, 20, 20)).toMatchObject({ w: 0, h: 0 });
  });
});

describe('initialRect', () => {
  it('opens bottom-right at the default size', () => {
    expect(initialRect(1280, 800)).toEqual({ x: 1280 - 420 - 16, y: 800 - 600 - 16, w: 420, h: 600 });
  });
});

describe('useFloatingFrame', () => {
  it('drags the window by its title bar and stops on release', () => {
    const { result } = renderHook(() => useFloatingFrame());
    const start = result.current.rect;

    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    move(400, 450);
    expect(result.current.rect).toMatchObject({ x: start.x - 100, y: start.y - 50 });

    release();
    move(0, 0);
    expect(result.current.rect).toMatchObject({ x: start.x - 100, y: start.y - 50 });
  });

  it('does not start a drag on a title-bar button', () => {
    const { result } = renderHook(() => useFloatingFrame());
    const start = result.current.rect;
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.appendChild(icon);

    act(() => result.current.onTitlePointerDown(pointer(500, 500, icon)));
    move(100, 100);

    expect(result.current.rect).toEqual(start);
  });

  it('resizes from the corner within the limits', () => {
    const { result } = renderHook(() => useFloatingFrame());
    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    move(100, 100);
    release();
    const start = result.current.rect;

    act(() => result.current.onResizePointerDown(pointer(800, 600)));
    move(860, 650);

    expect(result.current.rect).toMatchObject({ x: start.x, y: start.y, w: start.w + 60, h: start.h + 50 });
  });

  it('moves with the arrow keys and resizes with Shift + arrows', () => {
    const { result } = renderHook(() => useFloatingFrame());
    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    move(200, 200);
    release();
    const start = result.current.rect;

    act(() => result.current.onTitleKeyDown(key('ArrowRight')));
    expect(result.current.rect.x).toBe(start.x + FRAME.step);
    act(() => result.current.onTitleKeyDown(key('ArrowDown', true)));
    expect(result.current.rect.h).toBe(start.h + FRAME.step);
    act(() => result.current.onTitleKeyDown(key('Enter')));
    expect(result.current.rect).toMatchObject({ x: start.x + FRAME.step, h: start.h + FRAME.step });
  });

  it('ignores arrow keys from a control inside the title bar', () => {
    const { result } = renderHook(() => useFloatingFrame());
    const start = result.current.rect;
    const event = { ...key('ArrowLeft'), target: document.createElement('button') } as unknown as React.KeyboardEvent;

    act(() => result.current.onTitleKeyDown(event));

    expect(result.current.rect).toEqual(start);
  });

  it('maximizes and restores to exactly the previous size and place', () => {
    const { result } = renderHook(() => useFloatingFrame());
    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    move(300, 350);
    release();
    const placed = result.current.rect;

    act(() => result.current.toggleMaximize());
    expect(result.current.mode).toBe('maximized');
    // Nothing moves a maximized window.
    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    move(0, 0);
    act(() => result.current.onTitleKeyDown(key('ArrowUp')));

    act(() => result.current.toggleMaximize());
    expect(result.current.mode).toBe('normal');
    expect(result.current.rect).toEqual(placed);
  });

  it('minimizes and comes back to the mode it was in', () => {
    const { result } = renderHook(() => useFloatingFrame());

    act(() => result.current.toggleMaximize());
    act(() => result.current.toggleMinimize());
    expect(result.current.mode).toBe('minimized');
    act(() => result.current.toggleMinimize());
    expect(result.current.mode).toBe('maximized');

    act(() => result.current.toggleMaximize());
    act(() => result.current.toggleMinimize());
    // A minimized window moves with the arrows but is not resized by Shift.
    const start = result.current.rect;
    act(() => result.current.onTitleKeyDown(key('ArrowLeft', true)));
    expect(result.current.rect).toMatchObject({ x: start.x - FRAME.step, w: start.w });
    act(() => result.current.toggleMinimize());
    expect(result.current.mode).toBe('normal');
  });

  it('stays on screen when the browser window shrinks', () => {
    const { result } = renderHook(() => useFloatingFrame());

    setViewport(500, 500);
    act(() => void globalThis.dispatchEvent(new Event('resize')));

    const { x, y, w, h } = result.current.rect;
    expect(x + w).toBeLessThanOrEqual(500 - FRAME.gutter);
    expect(y + h).toBeLessThanOrEqual(500 - FRAME.gutter);
  });

  it('stops listening once unmounted', () => {
    const { result, unmount } = renderHook(() => useFloatingFrame());
    act(() => result.current.onTitlePointerDown(pointer(500, 500)));
    unmount();
    expect(() => globalThis.dispatchEvent(new MouseEvent('pointermove', { clientX: 1, clientY: 1 }))).not.toThrow();
  });
});
