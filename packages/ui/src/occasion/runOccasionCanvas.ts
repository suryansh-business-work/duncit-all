import { occasionFrame, occasionScene, type OccasionDecoration, type OccasionScene } from '@duncit/utils';
import { createPaintCache, paintOp } from './paint';

export interface OccasionCanvasOptions {
  /** Fit the canvas's parent box instead of the window — a preview inside a frame. */
  contained?: boolean;
  /** Paint one still frame and stop: the celebration is paused, or the viewer asked for reduced motion. */
  still?: boolean;
  /** The instant (seconds) a still frame shows. */
  stillAt?: number;
  /** Same seed, same scatter. */
  seed?: number;
}

/** Sharper than 2× costs fill rate for nothing a decoration needs. */
const MAX_DPR = 2;
/** After a stall (a background tab, a long task) time moves on by at most this, so nothing jumps. */
const MAX_STEP = 0.05;

/**
 * Run a look's decoration on a canvas until the returned cleanup is called:
 * sized to the window (or its parent box), sharp on high-density screens,
 * re-laid-out on resize, and paused while the page is hidden. Every listener
 * and frame is released on cleanup.
 */
export function runOccasionCanvas(
  canvas: HTMLCanvasElement,
  decoration: OccasionDecoration,
  options: OccasionCanvasOptions = {},
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const still = options.still === true;
  const stillAt = options.stillAt ?? 0;
  let width = 0;
  let height = 0;
  let scene: OccasionScene;
  let frame = 0;
  let last = 0;
  let time = 0;

  const paint = (t: number) => {
    ctx.clearRect(0, 0, width, height);
    for (const op of occasionFrame(scene, t)) paintOp(ctx, op, cache, width);
  };
  const cache = createPaintCache(() => {
    if (still) paint(stillAt);
  });

  const measure = () => {
    const box = options.contained ? canvas.parentElement : null;
    width = box ? box.clientWidth : globalThis.innerWidth;
    height = box ? box.clientHeight : globalThis.innerHeight;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene = occasionScene(decoration, width, height, options.seed ?? 1);
  };

  const tick = (now: number) => {
    const dt = last === 0 ? 0 : Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    time += dt;
    paint(time);
    frame = globalThis.requestAnimationFrame(tick);
  };
  const start = () => {
    if (still || frame !== 0) return;
    last = 0;
    frame = globalThis.requestAnimationFrame(tick);
  };
  const stop = () => {
    globalThis.cancelAnimationFrame(frame);
    frame = 0;
  };
  const onResize = () => {
    measure();
    paint(still ? stillAt : time);
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  measure();
  paint(still ? stillAt : 0);
  globalThis.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  if (!document.hidden) start();

  return () => {
    stop();
    globalThis.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    ctx.clearRect(0, 0, width, height);
  };
}
