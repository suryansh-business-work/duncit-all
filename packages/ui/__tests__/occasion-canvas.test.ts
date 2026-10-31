import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OccasionDecoration, OccasionDrawOp } from '@duncit/utils';
import { createPaintCache, paintOp } from '../src/occasion/paint';
import { runOccasionCanvas } from '../src/occasion/runOccasionCanvas';

/** A 2D context that records every call, so a test can read what was painted. */
function fakeContext() {
  const calls: { name: string; args: unknown[] }[] = [];
  const gradient = { addColorStop: vi.fn() };
  const record =
    (name: string, result?: unknown) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
      return result;
    };
  const ctx = {
    calls,
    gradient,
    fillStyle: '' as unknown,
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    rotate: record('rotate'),
    scale: record('scale'),
    fill: record('fill'),
    stroke: record('stroke'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    arc: record('arc'),
    fillRect: record('fillRect'),
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    setTransform: record('setTransform'),
    createRadialGradient: record('createRadialGradient', gradient),
    createLinearGradient: record('createLinearGradient', gradient),
  };
  return ctx;
}

type FakeContext = ReturnType<typeof fakeContext>;
const names = (ctx: FakeContext) => ctx.calls.map((call) => call.name);
const asCtx = (ctx: FakeContext) => ctx as unknown as CanvasRenderingContext2D;

class FakePath2D {
  static made: string[] = [];
  constructor(readonly d: string) {
    FakePath2D.made.push(d);
  }
}

class FakeImage {
  static all: FakeImage[] = [];
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  decoding = '';
  src = '';
  onload: (() => void) | null = null;
  constructor() {
    FakeImage.all.push(this);
  }
  /** What the browser does once the bytes arrive. */
  arrive(width: number, height: number) {
    this.complete = true;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload?.();
  }
}

beforeEach(() => {
  FakePath2D.made = [];
  FakeImage.all = [];
  vi.stubGlobal('Path2D', FakePath2D);
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const MARK: OccasionDrawOp = { op: 'mark', d: 'M0 0h4v4z', x: 10, y: 20, ox: 12, oy: 12, rotate: 0.5, scale: 2, flip: 0.5, fill: '#FFFFFF', stroke: '', stroke_width: 0, alpha: 0.6 };

describe('paintOp', () => {
  it('places a mark about its origin and fills it, parsing each path only once', () => {
    const ctx = fakeContext();
    const cache = createPaintCache();
    paintOp(asCtx(ctx), MARK, cache, 300);
    paintOp(asCtx(ctx), MARK, cache, 300);

    expect(FakePath2D.made).toEqual(['M0 0h4v4z']);
    expect(ctx.calls.slice(0, 6).map((c) => [c.name, c.args])).toEqual([
      ['save', []],
      ['translate', [10, 20]],
      ['rotate', [0.5]],
      // Squeezed sideways by the tumble, full height.
      ['scale', [1, 2]],
      ['translate', [-12, -12]],
      ['fill', [expect.any(FakePath2D)]],
    ]);
    expect(ctx.globalAlpha).toBe(0.6);
    expect(names(ctx)).not.toContain('stroke');
  });

  it('strokes an outline with a width and skips one without', () => {
    const ctx = fakeContext();
    paintOp(asCtx(ctx), { ...MARK, fill: '', stroke: '#333333', stroke_width: 1.5 }, createPaintCache(), 300);
    paintOp(asCtx(ctx), { ...MARK, fill: '', stroke: '#333333', stroke_width: 0 }, createPaintCache(), 300);

    expect(names(ctx).filter((n) => n === 'stroke')).toHaveLength(1);
    expect(names(ctx)).not.toContain('fill');
    expect([ctx.strokeStyle, ctx.lineWidth, ctx.lineCap]).toEqual(['#333333', 1.5, 'round']);
  });

  it("draws an artwork's layers at their offsets, centred on its box and mirrored for right-to-left", () => {
    const ctx = fakeContext();
    const layers = [
      { path: 'M0 0h10v10z', fill: '#FF0000', stroke: '', stroke_width: 0, x: 5, y: 6 },
      { path: 'M0 0L10 10', fill: '', stroke: '#000000', stroke_width: 2, x: 0, y: 0 },
    ];
    paintOp(asCtx(ctx), { op: 'art', layers, width: 100, height: 50, x: 20, y: 30, scale: 2, rotate: 0.1, mirrored: true }, createPaintCache(), 300);

    const translates = ctx.calls.filter((c) => c.name === 'translate').map((c) => c.args);
    expect(translates).toEqual([[120, 80], [-50, -25], [5, 6], [0, 0]]);
    expect(ctx.calls.filter((c) => c.name === 'scale').map((c) => c.args)).toEqual([[-1, 1], [2, 2]]);
    expect(names(ctx)).toEqual(expect.arrayContaining(['fill', 'stroke']));
    // Lifted off the page by a soft shadow.
    expect(ctx).toMatchObject({ shadowBlur: 14, shadowOffsetY: 10 });
  });

  it('draws an uploaded picture once it has loaded, at its own proportions', () => {
    const ctx = fakeContext();
    const ready = vi.fn();
    const cache = createPaintCache(ready);
    const op: OccasionDrawOp = { op: 'image', src: 'https://cdn.example/santa.png', x: 0, y: 0, width: 200, rotate: 0, mirrored: false };

    paintOp(asCtx(ctx), op, cache, 300);
    expect(names(ctx)).not.toContain('drawImage');
    expect(FakeImage.all[0]?.src).toBe('https://cdn.example/santa.png');

    FakeImage.all[0]?.arrive(400, 100);
    expect(ready).toHaveBeenCalledTimes(1);
    paintOp(asCtx(ctx), op, cache, 300);
    expect(FakeImage.all).toHaveLength(1);
    expect(ctx.calls.find((c) => c.name === 'drawImage')?.args.slice(1)).toEqual([-100, -25, 200, 50]);
  });

  it('needs no callback for a picture arriving when nothing has to repaint for it', () => {
    const ctx = fakeContext();
    const op: OccasionDrawOp = { op: 'image', src: 'https://cdn.example/kite.png', x: 0, y: 0, width: 100, rotate: 0, mirrored: true };
    const cache = createPaintCache();
    paintOp(asCtx(ctx), op, cache, 300);

    expect(() => FakeImage.all[0]?.arrive(100, 100)).not.toThrow();
    paintOp(asCtx(ctx), op, cache, 300);
    expect(ctx.calls.filter((c) => c.name === 'scale').map((c) => c.args)).toEqual([[-1, 1]]);
  });

  it('gives a spark a soft halo under its bright core', () => {
    const ctx = fakeContext();
    paintOp(asCtx(ctx), { op: 'dot', x: 5, y: 6, r: 2, color: '#FFD54F', alpha: 0.8, tail_x: null, tail_y: null }, createPaintCache(), 300);

    expect(ctx.calls.filter((c) => c.name === 'arc').map((c) => c.args[2])).toEqual([4.8, 2]);
    expect(names(ctx)).not.toContain('lineTo');
    expect(ctx.globalAlpha).toBe(0.8);
    expect(ctx.fillStyle).toBe('#FFD54F');
  });

  it('streaks a fast spark back to where it just was', () => {
    const ctx = fakeContext();
    paintOp(asCtx(ctx), { op: 'dot', x: 50, y: 60, r: 2, color: '#FF4081', alpha: 1, tail_x: 40, tail_y: 52 }, createPaintCache(), 300);

    expect(ctx.calls.find((c) => c.name === 'moveTo')?.args).toEqual([40, 52]);
    expect(ctx.calls.find((c) => c.name === 'lineTo')?.args).toEqual([50, 60]);
    expect(names(ctx).indexOf('stroke')).toBeLessThan(names(ctx).indexOf('arc'));
  });

  it('fills a radial glow over its own square and a band across the full width', () => {
    const ctx = fakeContext();
    paintOp(asCtx(ctx), { op: 'radial', x: 50, y: 60, radius: 40, inner_stop: 0.5, color: '#000000', inner_alpha: 0, outer_alpha: 0.5 }, createPaintCache(), 300);
    paintOp(asCtx(ctx), { op: 'linear', y0: 0, y1: 90, color: '#FFB300', top_alpha: 0.3, bottom_alpha: 0 }, createPaintCache(), 300);

    expect(ctx.calls.filter((c) => c.name === 'fillRect').map((c) => c.args)).toEqual([[10, 20, 80, 80], [0, 0, 300, 90]]);
    expect(ctx.gradient.addColorStop.mock.calls).toEqual([
      [0, 'rgba(0, 0, 0, 0)'],
      [0.5, 'rgba(0, 0, 0, 0)'],
      [1, 'rgba(0, 0, 0, 0.5)'],
      [0, 'rgba(255, 179, 0, 0.3)'],
      [1, 'rgba(255, 179, 0, 0)'],
    ]);
  });
});

const SNOW: OccasionDecoration = {
  particles: [{ shapes: ['SNOWFLAKE'], custom_paths: [], colors: ['#FFFFFF'], motion: 'FALL', count: 10, size_min: 4, size_max: 8, speed: 40, opacity: 1 }],
  flyers: [{ artwork: 'IMAGE', custom_layers: [], image_url: 'https://cdn.example/sleigh.png', direction: 'LTR', altitude_min: 10, altitude_max: 10, size: 100, duration: 10, interval: 20, bob: 0, trail_color: '' }],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'NONE', colors: [] },
};

describe('runOccasionCanvas', () => {
  let frames: FrameRequestCallback[];
  let hidden: boolean;

  const canvasWith = (ctx: FakeContext | null) => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as RenderingContext);
    return canvas;
  };
  const flush = (now: number) => {
    const queue = frames;
    frames = [];
    for (const run of queue) run(now);
  };

  beforeEach(() => {
    frames = [];
    hidden = false;
    vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => frames.push(run));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('devicePixelRatio', 3);
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  });

  it('does nothing on a canvas that has no 2D context', () => {
    expect(() => runOccasionCanvas(canvasWith(null), SNOW)()).not.toThrow();
  });

  it('sizes to the window at no more than 2× density and animates frame by frame', () => {
    const ctx = fakeContext();
    const canvas = canvasWith(ctx);
    const stop = runOccasionCanvas(canvas, SNOW);

    expect([canvas.width, canvas.height]).toEqual([globalThis.innerWidth * 2, globalThis.innerHeight * 2]);
    expect(ctx.calls.find((c) => c.name === 'setTransform')?.args).toEqual([2, 0, 0, 2, 0, 0]);
    expect(frames).toHaveLength(1);

    const before = ctx.calls.length;
    flush(1000);
    flush(1016);
    expect(ctx.calls.length).toBeGreaterThan(before);
    expect(frames).toHaveLength(1);

    stop();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('pauses while the page is hidden and picks up again when it is shown', () => {
    const stop = runOccasionCanvas(canvasWith(fakeContext()), SNOW);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    frames = [];
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(frames).toHaveLength(1);
    stop();
  });

  it('waits for the page to be shown before it starts', () => {
    hidden = true;
    const stop = runOccasionCanvas(canvasWith(fakeContext()), SNOW);

    expect(frames).toHaveLength(0);
    stop();
  });

  it('paints a still frame once, repaints it when a picture arrives or the window resizes, and never animates', () => {
    vi.stubGlobal('devicePixelRatio', 0);
    const ctx = fakeContext();
    const stop = runOccasionCanvas(canvasWith(ctx), SNOW, { still: true, stillAt: 3, seed: 4 });
    const clears = () => names(ctx).filter((n) => n === 'clearRect').length;

    expect(frames).toHaveLength(0);
    expect(clears()).toBe(1);
    FakeImage.all[0]?.arrive(200, 100);
    expect(clears()).toBe(2);
    expect(names(ctx)).toContain('drawImage');
    globalThis.dispatchEvent(new Event('resize'));
    expect(clears()).toBe(3);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames).toHaveLength(0);
    stop();
  });

  it('fits its parent box when contained, and a picture arriving mid-animation waits for the next frame', () => {
    const ctx = fakeContext();
    const canvas = canvasWith(ctx);
    const frame = document.createElement('div');
    Object.defineProperty(frame, 'clientWidth', { value: 320 });
    Object.defineProperty(frame, 'clientHeight', { value: 640 });
    frame.append(canvas);
    const stop = runOccasionCanvas(canvas, SNOW, { contained: true });

    expect([canvas.width, canvas.height]).toEqual([640, 1280]);
    // Three seconds of frames: the sleigh sets off after two and its picture is requested.
    for (let i = 0; i <= 60; i += 1) flush(1000 + i * 50);
    expect(FakeImage.all).toHaveLength(1);

    const clears = names(ctx).filter((n) => n === 'clearRect').length;
    FakeImage.all[0]?.arrive(200, 100);
    expect(names(ctx).filter((n) => n === 'clearRect').length).toBe(clears);
    globalThis.dispatchEvent(new Event('resize'));
    expect(names(ctx).filter((n) => n === 'clearRect').length).toBe(clears + 1);
    stop();
  });
});
