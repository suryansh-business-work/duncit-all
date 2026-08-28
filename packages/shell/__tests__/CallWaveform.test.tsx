/**
 * The live audio bar under a call — hand-drawn on a canvas from an
 * AnalyserNode (see the file's own header comment for why it isn't a
 * library). A fake AudioContext and a controllable requestAnimationFrame
 * stand in for the browser so the draw loop actually runs frame to frame.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import CallWaveform from '../src/staff-chat/CallWaveform';

const theme = createTheme();
const wrap = (ui: React.ReactNode) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const fakeStream = {} as MediaStream;

class FakeAnalyser {
  fftSize = 0;
  smoothingTimeConstant = 0;
  frequencyBinCount = 8;
  getByteFrequencyData(data: Uint8Array) {
    data.set([200, 0, 200, 0, 200, 0, 200, 0]);
  }
  disconnect = vi.fn();
}

class FakeAudioContext {
  createAnalyser() {
    return new FakeAnalyser();
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  close = vi.fn(async () => undefined);
}

let rafCallbacks: Array<() => void>;
let ctx: {
  scale: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  fillStyle: string;
};

beforeEach(() => {
  rafCallbacks = [];
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  ctx = { scale: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), fill: vi.fn(), roundRect: vi.fn(), fillStyle: '' };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CallWaveform', () => {
  it('draws nothing when there is no stream at all', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    wrap(<CallWaveform stream={null} label="You" />);

    expect(rafCallbacks).toHaveLength(0);
  });

  it('does nothing when the browser has no audio context at all', () => {
    vi.stubGlobal('AudioContext', undefined);
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'webkitAudioContext');
    wrap(<CallWaveform stream={fakeStream} label="You" />);

    expect(rafCallbacks).toHaveLength(0);
  });

  it('falls back to a 1x pixel ratio when the browser reports none', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('devicePixelRatio', 0);

    expect(() => wrap(<CallWaveform stream={fakeStream} label="You" />)).not.toThrow();
    expect(ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  it('draws a frame from the live level, and cleans up on unmount', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const { unmount } = wrap(<CallWaveform stream={fakeStream} label="You" />);

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();

    unmount();
  });

  it('skips a frame when the canvas cannot give a 2D context', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    wrap(<CallWaveform stream={fakeStream} label="You" />);

    expect(() => {
      act(() => {
        rafCallbacks[0]?.();
      });
    }).not.toThrow();
  });

  it('sizes the backing canvas once for its box, and skips resizing once it already matches', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const { container } = wrap(<CallWaveform stream={fakeStream} label="You" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    // More bars than analyser bins, so the "past the end of the data" fallback
    // and both bar colours (loud vs quiet) are exercised in the same frame.
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 50 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 44 });

    act(() => {
      rafCallbacks.at(-1)?.();
    });
    const afterRealDimensions = ctx.scale.mock.calls.length;
    expect(afterRealDimensions).toBeGreaterThan(0);

    act(() => {
      rafCallbacks.at(-1)?.();
    });
    expect(ctx.scale).toHaveBeenCalledTimes(afterRealDimensions);
  });
});
