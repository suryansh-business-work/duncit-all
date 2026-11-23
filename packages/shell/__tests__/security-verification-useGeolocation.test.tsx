/**
 * The browser's location permission as the screen sees it. Nothing is asked
 * until the person presses the button (unless the browser already remembers a
 * yes), every attempt is a fresh fix, a refusal is named for what it was, and a
 * late answer to a screen that has gone is dropped.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { locationErrorFor, useGeolocation } from '../src/security-verification/useGeolocation';

type Success = (position: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;
type Failure = (error: { code: number }) => void;

const getCurrentPosition = vi.fn<(ok: Success, fail: Failure, options: PositionOptions) => void>();

const POSITION = { coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 18.5 } };

function installGeolocation() {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
}

function installPermissions(query: () => Promise<{ state: string }>) {
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query } });
}

beforeEach(() => {
  getCurrentPosition.mockReset();
  installGeolocation();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'permissions');
});

describe('useGeolocation', () => {
  it('waits for the person: nothing is requested on load', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current).toMatchObject({ status: 'idle', fix: null });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('takes a fresh, high-accuracy fix when asked, and keeps what the browser reports', () => {
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());
    expect(result.current.status).toBe('requesting');
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });

    act(() => getCurrentPosition.mock.calls[0]![0](POSITION));
    expect(result.current).toMatchObject({
      status: 'granted',
      fix: { latitude: 12.9716, longitude: 77.5946, accuracy: 18.5 },
    });
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [99, 'unavailable'],
  ])('names a failed request (code %s) as %s and drops any earlier fix', (code, status) => {
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    act(() => getCurrentPosition.mock.calls[0]![0](POSITION));
    expect(result.current.fix).not.toBeNull();

    act(() => result.current.request());
    act(() => getCurrentPosition.mock.calls[1]![1]({ code }));
    expect(result.current).toMatchObject({ status, fix: null });
  });

  it('says so when the browser has no location support at all', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('unsupported');

    act(() => result.current.request());
    expect(result.current.status).toBe('unsupported');
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('ignores an answer that arrives after the screen has gone', () => {
    const { result, unmount } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    const [ok, fail] = getCurrentPosition.mock.calls[0]!;
    unmount();

    expect(() => {
      ok(POSITION);
      fail({ code: 1 });
    }).not.toThrow();
  });
});

describe('a permission the browser already remembers', () => {
  it('takes the fix straight away when it was granted', async () => {
    installPermissions(() => Promise.resolve({ state: 'granted' }));
    const { result } = renderHook(() => useGeolocation());

    await vi.waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe('requesting');
  });

  it.each(['prompt', 'denied'])('does not ask when the remembered state is %s', async (state) => {
    const query = vi.fn(() => Promise.resolve({ state }));
    installPermissions(query);
    renderHook(() => useGeolocation());

    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('waits for the button when the browser cannot answer the permission question', async () => {
    const query = vi.fn(() => Promise.reject(new Error('not supported')));
    installPermissions(query);
    const { result } = renderHook(() => useGeolocation());

    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(result.current.status).toBe('idle');
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('does not ask for a screen that went away while the permission was being read', async () => {
    let answer: (value: { state: string }) => void = () => undefined;
    installPermissions(() => new Promise((resolve) => (answer = resolve)));
    const { unmount } = renderHook(() => useGeolocation());
    unmount();

    answer({ state: 'granted' });
    await Promise.resolve();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});

describe('locationErrorFor', () => {
  it.each([
    ['denied', 'PERMISSION_DENIED'],
    ['unavailable', 'POSITION_UNAVAILABLE'],
    ['timeout', 'TIMEOUT'],
    ['unsupported', 'UNSUPPORTED'],
  ] as const)('records %s as %s', (status, code) => {
    expect(locationErrorFor(status)).toBe(code);
  });

  it.each(['idle', 'requesting', 'granted'] as const)('records nothing for %s — nothing failed', (status) => {
    expect(locationErrorFor(status)).toBeNull();
  });
});
