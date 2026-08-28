/**
 * Translating a saved microphone/camera into this browser's own device ids —
 * a deviceId is salted per origin, so the saved id only means something here
 * when this browser issued it; otherwise the same NAME is the next best clue.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { labelOf, matchDevice, useResolvedDevices } from '../src/staff-chat/devices/useResolvedDevices';

const device = (deviceId: string, label: string, kind: MediaDeviceKind): MediaDeviceInfo =>
  ({ deviceId, label, kind, groupId: '' }) as MediaDeviceInfo;

describe('matchDevice', () => {
  it('answers the device default for nothing saved at all', () => {
    expect(matchDevice([], { id: '', label: '' })).toBe('');
  });

  it('trusts the saved id outright on a list with no ids yet (no permission granted here)', () => {
    const list = [device('', 'Built-in Mic', 'audioinput')];
    expect(matchDevice(list, { id: 'saved-id', label: 'Built-in Mic' })).toBe('saved-id');
  });

  it("keeps the saved id when this browser's own list still has it", () => {
    const list = [device('id-1', 'USB Mic', 'audioinput'), device('id-2', 'Built-in Mic', 'audioinput')];
    expect(matchDevice(list, { id: 'id-2', label: 'Built-in Mic' })).toBe('id-2');
  });

  it('falls back to the device wearing the same name when the saved id is gone', () => {
    const list = [device('new-id', 'USB Headset', 'audioinput')];
    expect(matchDevice(list, { id: 'old-id', label: 'USB Headset' })).toBe('new-id');
  });

  it('falls back to the OS default when neither the id nor the name is found', () => {
    const list = [device('id-1', 'Built-in Mic', 'audioinput')];
    expect(matchDevice(list, { id: 'old-id', label: 'USB Headset' })).toBe('');
  });

  it('never searches by name with no name saved at all', () => {
    const list = [device('id-1', 'Built-in Mic', 'audioinput')];
    expect(matchDevice(list, { id: 'old-id', label: '' })).toBe('');
  });
});

describe('labelOf', () => {
  it("names a device this browser knows, and answers '' for one it does not", () => {
    const list = [device('id-1', 'Built-in Mic', 'audioinput')];
    expect(labelOf(list, 'id-1')).toBe('Built-in Mic');
    expect(labelOf(list, 'id-2')).toBe('');
  });
});

describe('useResolvedDevices', () => {
  const nav = globalThis.navigator as unknown as { mediaDevices?: unknown };
  const originalMediaDevices = nav.mediaDevices;

  afterEach(() => {
    nav.mediaDevices = originalMediaDevices;
  });

  it('does nothing on a browser with no mediaDevices API at all', () => {
    nav.mediaDevices = undefined;
    const { result } = renderHook(() => useResolvedDevices('', '', '', ''));
    expect(result.current.mics).toEqual([]);
  });

  it('reads the list once, and again on every devicechange, cleaning up its listener on unmount', async () => {
    const all = [device('mic-1', 'Built-in Mic', 'audioinput')];
    const enumerateDevices = vi.fn().mockResolvedValue(all);
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    nav.mediaDevices = { enumerateDevices, addEventListener, removeEventListener };

    const { result, unmount } = renderHook(() => useResolvedDevices('mic-1', 'Built-in Mic', '', ''));
    await waitFor(() => expect(result.current.mics).toHaveLength(1));

    expect(addEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
  });

  it('drops a late answer that arrives after the hook has already unmounted', async () => {
    let resolveList: (devices: MediaDeviceInfo[]) => void = () => undefined;
    const enumerateDevices = vi.fn(
      () =>
        new Promise<MediaDeviceInfo[]>((resolve) => {
          resolveList = resolve;
        }),
    );
    nav.mediaDevices = { enumerateDevices };

    const { unmount } = renderHook(() => useResolvedDevices('', '', '', ''));
    unmount();

    expect(() => {
      act(() => resolveList([device('mic-1', 'Built-in Mic', 'audioinput')]));
    }).not.toThrow();
  });

  it('works on a mediaDevices with no devicechange event support at all', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([]);
    nav.mediaDevices = { enumerateDevices };

    const { unmount } = renderHook(() => useResolvedDevices('', '', '', ''));
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
  });
});
