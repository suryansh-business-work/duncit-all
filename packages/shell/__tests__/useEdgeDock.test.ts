/**
 * Dragging the Agent tab along the edge of the viewport: a press that never
 * moved is a click, a press that moves past the slop is a drag, and the
 * travel available recomputes whenever the window is resized.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEdgeDock } from '../src/chrome/agent/useEdgeDock';

const fakeEvent = (x: number, y: number, target: Partial<HTMLElement> = {}) => ({
  clientX: x,
  clientY: y,
  pointerId: 1,
  currentTarget: target as HTMLElement,
  preventDefault: vi.fn(),
});

const originalInnerHeight = globalThis.innerHeight;
const originalInnerWidth = globalThis.innerWidth;

afterEach(() => {
  Object.defineProperty(globalThis, 'innerHeight', { value: originalInnerHeight, configurable: true });
  Object.defineProperty(globalThis, 'innerWidth', { value: originalInnerWidth, configurable: true });
});

describe('useEdgeDock', () => {
  it('treats a press that never moved past the slop as a click, not a drag', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 0.5 }, onCommit));

    act(() => result.current.handlers.onPointerDown(fakeEvent(1000, 300) as never));
    act(() => result.current.handlers.onPointerMove(fakeEvent(1001, 301) as never));
    act(() => result.current.handlers.onPointerUp(fakeEvent(1001, 301) as never));

    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.dragging).toBe(false);
  });

  it('ignores a pointer move with no press behind it', () => {
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 0.5 }, vi.fn()));

    expect(() => {
      act(() => result.current.handlers.onPointerMove(fakeEvent(500, 500) as never));
    }).not.toThrow();
    expect(result.current.dragging).toBe(false);
  });

  it('captures and releases the pointer when the element supports it', () => {
    const onCommit = vi.fn();
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const target = { setPointerCapture, releasePointerCapture };
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 0.5 }, onCommit));

    act(() => result.current.handlers.onPointerDown(fakeEvent(1000, 300, target) as never));
    expect(setPointerCapture).toHaveBeenCalledWith(1);

    act(() => result.current.handlers.onPointerUp(fakeEvent(1000, 300, target) as never));
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('drags past the slop, crossing to the other edge, and commits on release', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 0.5 }, onCommit));

    act(() => result.current.handlers.onPointerDown(fakeEvent(1000, 300) as never));
    act(() => result.current.handlers.onPointerMove(fakeEvent(20, 400) as never));
    expect(result.current.dragging).toBe(true);
    expect(result.current.dock.edge).toBe('LEFT');

    act(() => result.current.handlers.onPointerCancel(fakeEvent(20, 400) as never));
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ edge: 'LEFT' }));
    expect(result.current.dragging).toBe(false);
  });

  it('pins the offset to zero when the viewport gives the tab nowhere to travel', () => {
    Object.defineProperty(globalThis, 'innerHeight', { value: 100, configurable: true });
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 0.5 }, onCommit));

    act(() => result.current.handlers.onPointerDown(fakeEvent(1000, 50) as never));
    act(() => result.current.handlers.onPointerMove(fakeEvent(1000, 90) as never));

    expect(result.current.dock.offset).toBe(0);
    expect(result.current.top).toBe(0);
  });

  it('recomputes the available travel when the window is resized', () => {
    const { result } = renderHook(() => useEdgeDock({ edge: 'RIGHT', offset: 1 }, vi.fn()));
    const before = result.current.top;

    act(() => {
      Object.defineProperty(globalThis, 'innerHeight', { value: before + 400, configurable: true });
      globalThis.dispatchEvent(new Event('resize'));
    });

    expect(result.current.top).not.toBe(before);
  });
});
