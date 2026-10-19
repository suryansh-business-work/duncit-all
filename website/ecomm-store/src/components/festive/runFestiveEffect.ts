import { PARTICLE_PATHS, type OccasionEffect } from '../../theme/occasions';
import { advanceParticle, createRandom, particleAlpha, particleCount, spawnParticle, type Particle } from './particles';

/** The path box every shape is drawn in (see `PARTICLE_PATHS`). */
const PATH_BOX = 24;
/** Sharper than 2x costs fill rate for nothing a decoration needs. */
const MAX_DPR = 2;
/** A frame after a long stall (a background tab) moves no further than this, in seconds. */
const MAX_STEP = 0.05;

/**
 * Run an occasion's animation on a canvas until the returned cleanup is called:
 * DPR-aware, resized with the window, particle count scaled by its width, and
 * paused while the document is hidden. Every listener and frame is released on
 * cleanup.
 */
export function runFestiveEffect(canvas: HTMLCanvasElement, effect: OccasionEffect): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const random = createRandom(Date.now());
  const paths = effect.shapes.map((shape) => new Path2D(PARTICLE_PATHS[shape]));
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let frame = 0;
  let last = 0;
  let time = 0;

  const resize = () => {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    width = globalThis.innerWidth;
    height = globalThis.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = particleCount(effect, width);
    particles = Array.from({ length: count }, (_, index) => particles[index] ?? spawnParticle(effect, random, width, height, true));
  };

  const draw = (particle: Particle) => {
    const path = paths[particle.shape];
    if (!path) return;
    const scale = particle.size / PATH_BOX;
    ctx.save();
    ctx.globalAlpha = particleAlpha(particle, effect, time);
    ctx.fillStyle = particle.color;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.scale(scale, scale);
    ctx.translate(-PATH_BOX / 2, -PATH_BOX / 2);
    ctx.fill(path);
    ctx.restore();
  };

  const tick = (now: number) => {
    const dt = last === 0 ? 0 : Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    time += dt;
    ctx.clearRect(0, 0, width, height);
    particles = particles.map((particle) =>
      advanceParticle(particle, effect.motion, dt, time, width, height) ? spawnParticle(effect, random, width, height, false) : particle,
    );
    particles.forEach(draw);
    frame = globalThis.requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame !== 0) return;
    last = 0;
    frame = globalThis.requestAnimationFrame(tick);
  };
  const stop = () => {
    globalThis.cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  resize();
  globalThis.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  if (!document.hidden) start();

  return () => {
    stop();
    globalThis.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    ctx.clearRect(0, 0, width, height);
  };
}
