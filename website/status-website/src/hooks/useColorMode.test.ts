import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useColorMode } from './useColorMode';

const KEY = 'status_color_mode';

const stubMatchMedia = (matches: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useColorMode initial mode', () => {
  it('honours a persisted preference', () => {
    localStorage.setItem(KEY, 'dark');
    expect(renderHook(() => useColorMode()).result.current.mode).toBe('dark');

    localStorage.setItem(KEY, 'light');
    expect(renderHook(() => useColorMode()).result.current.mode).toBe('light');
  });

  it('follows the system preference when nothing is stored', () => {
    stubMatchMedia(true);
    expect(renderHook(() => useColorMode()).result.current.mode).toBe('dark');

    stubMatchMedia(false);
    expect(renderHook(() => useColorMode()).result.current.mode).toBe('light');
  });

  it('defaults to light when storage throws and matchMedia is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useColorMode()).result.current.mode).toBe('light');
  });
});

describe('useColorMode toggle', () => {
  it('flips the mode and persists the new value', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('light');

    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');

    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('light');
  });

  it('still toggles for the session when persisting throws', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useColorMode());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('dark');
  });
});
