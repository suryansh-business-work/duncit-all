import type { OccasionEffect, ParticleMotion } from '../../theme/occasions';

/** One mark on the canvas, in CSS pixels. */
export interface Particle {
  x: number;
  y: number;
  size: number;
  /** Pixels per second along the motion's axis. */
  speed: number;
  rotation: number;
  /** Radians per second. */
  spin: number;
  /** Offsets the sway / twinkle wave so the marks never move in step. */
  phase: number;
  shape: number;
  color: string;
}

export type Random = () => number;

/** The width the effect's `count` is tuned for; narrower screens get proportionally fewer marks. */
const DESKTOP_WIDTH = 1440;
const MIN_COUNT = 6;
const SWAY_PX = 14;
const MOVING_ALPHA = 0.8;

/**
 * A small seeded generator (mulberry32). The scatter is decorative, so a
 * cryptographic source would only cost time; seeding keeps it reproducible.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

/** How many marks fit this viewport without crowding a phone. */
export function particleCount(effect: OccasionEffect, viewportWidth: number): number {
  const scaled = Math.round(effect.count * Math.min(1, viewportWidth / DESKTOP_WIDTH));
  return Math.max(MIN_COUNT, scaled);
}

/**
 * A fresh mark. `scatter` places it anywhere on screen (the first frame);
 * otherwise it enters from the edge its motion starts at.
 */
export function spawnParticle(effect: OccasionEffect, random: Random, width: number, height: number, scatter: boolean): Particle {
  const size = between(random, effect.size[0], effect.size[1]);
  const particle: Particle = {
    x: random() * width,
    y: random() * height,
    size,
    speed: effect.speed * between(random, 0.6, 1.4),
    rotation: random() * Math.PI * 2,
    spin: between(random, -0.8, 0.8),
    phase: random() * Math.PI * 2,
    shape: Math.floor(random() * effect.shapes.length),
    color: effect.colors[Math.floor(random() * effect.colors.length)] ?? effect.colors[0] ?? '',
  };
  if (!scatter) enterFromEdge(particle, effect.motion, height);
  return particle;
}

/** A twinkle never leaves, so it never re-enters: it keeps its scattered spot. */
function enterFromEdge(particle: Particle, motion: ParticleMotion, height: number): void {
  if (motion === 'fall') particle.y = -particle.size;
  if (motion === 'rise') particle.y = height + particle.size;
  if (motion === 'drift') particle.x = -particle.size;
}

/** Whether a moving mark has left the screen on its far side. */
function hasLeft(particle: Particle, motion: ParticleMotion, width: number, height: number): boolean {
  if (motion === 'fall') return particle.y - particle.size > height;
  if (motion === 'rise') return particle.y + particle.size < 0;
  if (motion === 'drift') return particle.x - particle.size > width;
  return false;
}

/** Move one mark by `dt` seconds; reports whether it should be replaced. */
export function advanceParticle(particle: Particle, motion: ParticleMotion, dt: number, time: number, width: number, height: number): boolean {
  const sway = Math.sin(time * 0.8 + particle.phase) * SWAY_PX * dt;
  if (motion === 'fall') {
    particle.y += particle.speed * dt;
    particle.x += sway;
  } else if (motion === 'rise') {
    particle.y -= particle.speed * dt;
    particle.x += sway;
  } else if (motion === 'drift') {
    particle.x += particle.speed * dt;
    particle.y += sway;
  }
  particle.rotation += particle.spin * dt * (motion === 'twinkle' ? 0.3 : 1);
  return hasLeft(particle, motion, width, height);
}

/** Opacity this frame: a slow pulse for a twinkle, steady and soft otherwise. */
export function particleAlpha(particle: Particle, effect: OccasionEffect, time: number): number {
  if (effect.motion !== 'twinkle') return MOVING_ALPHA;
  const wave = 0.5 + 0.5 * Math.sin(time * (effect.speed / 10) + particle.phase);
  return 0.2 + 0.65 * wave;
}
