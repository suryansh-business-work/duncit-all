import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@duncit/auth-tokens';
import { useAuthFit } from '../useAuthFit';

const FIT = auth.fit;
const FLEXIBLE = FIT.designHeight - FIT.fixedHeight;
/** The viewport height at which the flexible part of the design is drawn at `ratio`. */
const heightAt = (ratio: number) => FIT.fixedHeight + FLEXIBLE * ratio;

const original = globalThis.innerHeight;
const setViewport = (height: number) => {
  Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: height });
};

afterEach(() => {
  setViewport(original);
  vi.restoreAllMocks();
});

describe('useAuthFit', () => {
  it('draws the design as is on a viewport tall enough for it', () => {
    setViewport(FIT.designHeight);
    const { result } = renderHook(() => useAuthFit());
    expect(result.current.scale).toBe(FIT.maxScale);
    expect(result.current.size(40)).toBe(40);
  });

  it('never grows the design past its own size on a taller viewport', () => {
    setViewport(FIT.designHeight * 2);
    const { result } = renderHook(() => useAuthFit());
    expect(result.current.scale).toBe(FIT.maxScale);
  });

  it('shrinks only the flexible part on a shorter viewport, rounding sizes to whole pixels', () => {
    setViewport(heightAt(0.75));
    const { result } = renderHook(() => useAuthFit());
    expect(result.current.scale).toBeCloseTo(0.75, 5);
    expect(result.current.size(40)).toBe(30);
    expect(result.current.size(15)).toBe(11);
  });

  it('stops shrinking at the minimum scale, and keeps a size above its floor', () => {
    setViewport(FIT.fixedHeight);
    const { result } = renderHook(() => useAuthFit());
    expect(result.current.scale).toBe(FIT.minScale);
    expect(result.current.size(FIT.titleSize, FIT.titleMinSize)).toBe(
      Math.max(FIT.titleMinSize, Math.round(FIT.titleSize * FIT.minScale)),
    );
    expect(result.current.size(FIT.titleSize, FIT.titleMinSize)).toBeGreaterThanOrEqual(FIT.titleMinSize);
  });

  it('re-fits when the window is resized', () => {
    setViewport(FIT.designHeight);
    const { result } = renderHook(() => useAuthFit());
    expect(result.current.scale).toBe(FIT.maxScale);

    act(() => {
      setViewport(heightAt(0.75));
      globalThis.dispatchEvent(new Event('resize'));
    });
    expect(result.current.scale).toBeCloseTo(0.75, 5);
  });

  it('stops listening once unmounted', () => {
    const remove = vi.spyOn(globalThis, 'removeEventListener');
    const { unmount } = renderHook(() => useAuthFit());
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
