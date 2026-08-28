/**
 * The frame loop, with a code actually in view.
 *
 * jsQR is stubbed rather than handed a real QR bitmap: what this covers is the
 * hook's own contract — a decoded frame is reported ONCE and the loop stops,
 * because `active` is the caller's control surface and re-submitting the same
 * ticket on every frame is exactly what it exists to prevent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useQrScanner } from '../src/ticket-scan/useQrScanner';

const jsQR = vi.hoisted(() => vi.fn());
vi.mock('jsqr', () => ({ default: jsQR }));

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const frames: FrameRequestCallback[] = [];

const attach = (result: { current: ReturnType<typeof useQrScanner> }) => {
  Object.defineProperty(result.current.videoRef, 'current', {
    configurable: true,
    value: {
      HAVE_ENOUGH_DATA: 4,
      readyState: 4,
      videoWidth: 4,
      videoHeight: 4,
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
    },
  });
  Object.defineProperty(result.current.canvasRef, 'current', {
    configurable: true,
    value: {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(64) }),
      }),
    },
  });
};

beforeEach(() => {
  frames.length = 0;
  jsQR.mockReset();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useQrScanner with a code in view', () => {
  it('reports the decoded ticket once and stops asking for frames', async () => {
    jsQR.mockReturnValue({ data: '  DUN-TKT-001  ' });
    const onCode = vi.fn();
    const { result } = renderHook(() => useQrScanner(true, onCode));
    attach(result);
    await settle();

    await act(async () => {
      frames.shift()?.(0);
    });

    expect(onCode).toHaveBeenCalledWith('DUN-TKT-001');
    // No further frame was queued: the caller turns `active` off from here.
    expect(frames).toHaveLength(0);
  });

  it('keeps looking when the code decoded to nothing readable', async () => {
    jsQR.mockReturnValue({ data: '   ' });
    const onCode = vi.fn();
    const { result } = renderHook(() => useQrScanner(true, onCode));
    attach(result);
    await settle();

    await act(async () => {
      frames.shift()?.(0);
    });

    expect(onCode).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
  });

  it('keeps looking when the frame held no code at all', async () => {
    jsQR.mockReturnValue(null);
    const onCode = vi.fn();
    const { result } = renderHook(() => useQrScanner(true, onCode));
    attach(result);
    await settle();

    await act(async () => {
      frames.shift()?.(0);
    });

    expect(onCode).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
  });

  // A frame queued before the cleanup ran still fires; it must decode nothing.
  it('reads nothing from a frame that fires after it stopped', async () => {
    jsQR.mockReturnValue({ data: 'DUN-TKT-001' });
    const onCode = vi.fn();
    const { result, unmount } = renderHook(() => useQrScanner(true, onCode));
    attach(result);
    await settle();
    const pending = frames.shift();

    unmount();
    await act(async () => {
      pending?.(0);
    });

    expect(onCode).not.toHaveBeenCalled();
  });
});
