/**
 * Trying a microphone and camera before a call — a fake getUserMedia and a
 * fake AudioContext stand in for the browser, because the whole point of this
 * hook is that it actually opens the device rather than trusting a label.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeviceTest } from '../src/staff-chat/devices/useDeviceTest';

const track = (kind: 'audio' | 'video') => ({
  kind,
  stopped: false,
  stop() {
    this.stopped = true;
  },
});

const stream = (kinds: ('audio' | 'video')[]) => {
  const tracks = kinds.map(track);
  return {
    tracks,
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
  };
};

class FakeAnalyser {
  fftSize = 0;
  frequencyBinCount = 4;
  getByteFrequencyData(bins: Uint8Array) {
    bins.set([255, 255, 255, 255]);
  }
}

class FakeAudioContext {
  createAnalyser() {
    return new FakeAnalyser();
  }
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  close = vi.fn(async () => undefined);
}

let media: { getUserMedia: ReturnType<typeof vi.fn>; enumerateDevices: ReturnType<typeof vi.fn> };
let rafCallbacks: Array<() => void>;

beforeEach(() => {
  rafCallbacks = [];
  media = {
    getUserMedia: vi.fn(async () => stream(['audio', 'video'])),
    enumerateDevices: vi.fn(async () => [
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic', groupId: '' } as MediaDeviceInfo,
      { deviceId: 'cam-1', kind: 'videoinput', label: 'Cam', groupId: '' } as MediaDeviceInfo,
    ]),
  };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: media });
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useDeviceTest', () => {
  it('opens the chosen devices and starts metering the microphone level', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const { result } = renderHook(() => useDeviceTest('mic-1', 'cam-1', true));

    await act(async () => {
      await result.current.start(true);
    });

    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: { exact: 'mic-1' } },
      video: { deviceId: { exact: 'cam-1' } },
    });
    expect(result.current.testing).toBe(true);

    act(() => {
      rafCallbacks[0]?.();
    });
    expect(result.current.level).toBeGreaterThan(0);
  });

  it('opens only the microphone for an audio-only test, using the system default when none is chosen', async () => {
    const { result } = renderHook(() => useDeviceTest('', '', true));

    await act(async () => {
      await result.current.start(false);
    });

    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
  });

  it('opens the system default camera when video is wanted but none is chosen', async () => {
    const { result } = renderHook(() => useDeviceTest('', '', true));

    await act(async () => {
      await result.current.start(true);
    });

    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });
  });

  it('reports a device that refuses to open', async () => {
    media.getUserMedia.mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useDeviceTest('mic-1', '', true));

    await act(async () => {
      await result.current.start(false);
    });

    expect(result.current.error).toBe('denied');
  });

  it('falls back to a generic message when whatever was thrown is not an Error', async () => {
    media.getUserMedia.mockRejectedValueOnce('boom');
    const { result } = renderHook(() => useDeviceTest('mic-1', '', true));

    await act(async () => {
      await result.current.start(false);
    });

    expect(result.current.error).toBe('Could not open that device');
  });

  it('stops every track and tears down the meter on stop', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const opened = stream(['audio', 'video']);
    media.getUserMedia.mockResolvedValueOnce(opened);
    const { result } = renderHook(() => useDeviceTest('mic-1', 'cam-1', true));

    await act(async () => {
      await result.current.start(true);
    });

    act(() => {
      result.current.stop();
    });

    expect(opened.tracks.every((t) => t.stopped)).toBe(true);
    expect(result.current.level).toBe(0);
    expect(result.current.testing).toBe(false);
  });

  it('does nothing risky when stopped while nothing is open', () => {
    const { result } = renderHook(() => useDeviceTest('', '', false));

    expect(() => {
      act(() => {
        result.current.stop();
      });
    }).not.toThrow();
  });

  it('skips metering when the browser has no audio context at all', async () => {
    vi.stubGlobal('AudioContext', undefined);
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'webkitAudioContext');
    const { result } = renderHook(() => useDeviceTest('', '', true));

    await act(async () => {
      await result.current.start(false);
    });

    expect(result.current.level).toBe(0);
  });

  it('skips metering when the opened stream has no audio track', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    media.getUserMedia.mockResolvedValueOnce(stream(['video']));
    const { result } = renderHook(() => useDeviceTest('', 'cam-1', true));

    await act(async () => {
      await result.current.start(true);
    });

    expect(result.current.level).toBe(0);
  });

  it('falls back to a vendor-prefixed audio context when that is all the browser has', async () => {
    vi.stubGlobal('AudioContext', undefined);
    (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = FakeAudioContext;
    const { result } = renderHook(() => useDeviceTest('mic-1', '', true));

    await act(async () => {
      await result.current.start(false);
    });
    act(() => {
      rafCallbacks[0]?.();
    });

    expect(result.current.level).toBeGreaterThan(0);
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'webkitAudioContext');
  });

  it('does nothing when the browser cannot enumerate devices at all', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: undefined });
    const { result } = renderHook(() => useDeviceTest('', '', true));

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(result.current.devices).toEqual({ mics: [], cams: [] });
  });

  it('swallows a refresh that fails when the dialog opens', async () => {
    media.enumerateDevices.mockRejectedValueOnce(new Error('blocked'));

    expect(() => renderHook(() => useDeviceTest('', '', true))).not.toThrow();
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  });

  it('stops the preview when the dialog closes', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const { result, rerender } = renderHook(({ open }) => useDeviceTest('mic-1', 'cam-1', open), {
      initialProps: { open: true },
    });

    await act(async () => {
      await result.current.start(true);
    });
    expect(result.current.testing).toBe(true);

    rerender({ open: false });

    expect(result.current.testing).toBe(false);
  });

  it('splits the refreshed device list into microphones and cameras', async () => {
    const { result } = renderHook(() => useDeviceTest('', '', true));

    await act(async () => {
      await result.current.start(false);
    });

    expect(result.current.devices.mics).toHaveLength(1);
    expect(result.current.devices.cams).toHaveLength(1);
  });
});
