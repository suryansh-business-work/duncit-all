import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { DUID_STORAGE_KEY, type SessionDevice } from '@duncit/user-core';
import { useDeviceInfo } from '../src/useDeviceInfo';

const VERSION_GLOBAL = '__APP_VERSION__';

/**
 * Renders the hook through the SERVER renderer, which never touches `window`,
 * `navigator` or `screen` — the environments below take those away, and the
 * DOM client renderer cannot mount without them.
 */
function Probe({ onInfo }: Readonly<{ onInfo: (info: SessionDevice) => void }>) {
  onInfo(useDeviceInfo());
  return null;
}

function probeServerSide(): SessionDevice {
  let captured: SessionDevice | undefined;
  renderToString(
    <Probe
      onInfo={(info) => {
        captured = info;
      }}
    />,
  );
  if (!captured) throw new Error('useDeviceInfo never ran');
  return captured;
}

afterEach(() => {
  vi.unstubAllGlobals();
  // A throwing getter (see below) cannot be overwritten by assignment.
  delete (globalThis as Record<string, unknown>)[VERSION_GLOBAL];
  localStorage.clear();
});

describe('useDeviceInfo', () => {
  it('probes the browser and mints the DUID on first read', () => {
    const { result } = renderHook(() => useDeviceInfo());
    const info = result.current;
    expect(info.platform).toBe('web');
    expect(info.os).toBe(navigator.userAgent);
    expect(info.model).toBe(`${screen.width}x${screen.height}`);
    expect(info.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    // The id it reports is the one it stored, so the next read is the same device.
    expect(info.duid).not.toBe('');
    expect(localStorage.getItem(DUID_STORAGE_KEY)).toBe(info.duid);
  });

  it('reads an existing DUID rather than minting a second one', () => {
    localStorage.setItem(DUID_STORAGE_KEY, 'device-existing');
    const { result } = renderHook(() => useDeviceInfo());
    expect(result.current.duid).toBe('device-existing');
  });

  it('is memoised: the same object across re-renders', () => {
    const { result, rerender } = renderHook(() => useDeviceInfo());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('reports an empty app version where the surface never baked one in', () => {
    const { result } = renderHook(() => useDeviceInfo());
    expect(result.current.app_version).toBe('');
  });

  it('reports the baked-in app version when the surface defines it', () => {
    vi.stubGlobal(VERSION_GLOBAL, '1.72.9');
    const { result } = renderHook(() => useDeviceInfo());
    expect(result.current.app_version).toBe('1.72.9');
  });

  it('reports an empty app version when reading the define throws', () => {
    Object.defineProperty(globalThis, VERSION_GLOBAL, {
      configurable: true,
      get() {
        throw new Error('define exploded');
      },
    });
    const { result } = renderHook(() => useDeviceInfo());
    expect(result.current.app_version).toBe('');
  });

  it('is SSR-safe: an empty device when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(probeServerSide()).toEqual({
      duid: '',
      platform: 'unknown',
      os: '',
      model: '',
      app_version: '',
      timezone: '',
    });
  });

  it('reports blank os and a 0x0 model where navigator and screen are absent', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('screen', undefined);
    const info = probeServerSide();
    expect(info.platform).toBe('web');
    expect(info.os).toBe('');
    expect(info.model).toBe('0x0');
  });

  it('reports blank os and a 0x0 model where navigator and screen carry nothing', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('screen', {});
    const info = probeServerSide();
    expect(info.os).toBe('');
    expect(info.model).toBe('0x0');
  });
});
