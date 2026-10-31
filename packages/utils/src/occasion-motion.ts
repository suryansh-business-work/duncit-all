import type { OccasionFireworks, OccasionFlyer, OccasionMotion, OccasionParticleLayer } from './occasion-design';
import { hash01, occasionRandom, pickColor } from './occasion-random';

/**
 * Where every moving piece of a look is at `t` seconds. Each function is pure
 * in time — a particle's position is computed from its seed and the clock, not
 * stepped frame by frame — so the canvas can redraw any instant, the native
 * renderer can hand the same numbers to its animation driver, and a stalled tab
 * resumes without a jump.
 */

/**
 * A mark's placement in one frame, in CSS px; `rotation` in radians. `flip`
 * (0–1) squeezes it sideways: a mark turning on an axis through the screen,
 * which is what makes confetti and snow read as tumbling in 3D.
 */
export interface MarkPose {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  flip: number;
}

/** One particle's fixed traits; its pose at any time follows from these. */
export interface OccasionParticle {
  /** 0–1 across the axis it does not travel along (x for FALL/RISE/TWINKLE, y for DRIFT). */
  lane: number;
  /** 0–1 down the screen, for a TWINKLE (which does not travel). */
  depth: number;
  /**
   * 0–1 nearness. Near marks are bigger, faster and solid; far ones small,
   * slow and faint — the parallax that gives a flat screen depth.
   */
  z: number;
  /** Radians per second of the 3D tumble. */
  flutter: number;
  /** 0–1 offset along its loop, so the swarm never moves in step. */
  phase: number;
  size: number;
  /** Px per second. */
  speed: number;
  /** Radians per second. */
  spin: number;
  /** Starting rotation, radians. */
  tilt: number;
  /** Px of side-to-side sway. */
  sway: number;
  /** Index into the layer's drawable paths. */
  shape: number;
  color: string;
}

/** The width a layer's `count` is tuned for. */
const DESKTOP_WIDTH = 1440;
/** A phone still gets this share of the swarm, so snow on a phone is not a few lonely flakes. */
const MIN_SCALE = 0.45;
/** A ceiling whatever the look asks for: decoration must never cost a frame. */
export const MAX_PARTICLES = 160;

/** How many marks a layer draws on a screen this wide. */
export function particleCountFor(count: number, viewportWidth: number): number {
  const scale = Math.min(1, Math.max(MIN_SCALE, viewportWidth / DESKTOP_WIDTH));
  return Math.min(MAX_PARTICLES, Math.max(0, Math.round(count * scale)));
}

/** A layer's particles for a screen this wide, scattered from `seed`; none when it has no drawable shape. */
export function seedParticles(
  layer: Pick<OccasionParticleLayer, 'count' | 'size_min' | 'size_max' | 'speed' | 'colors'>,
  viewportWidth: number,
  shapeCount: number,
  seed: number,
): OccasionParticle[] {
  if (shapeCount <= 0) return [];
  const random = occasionRandom(seed);
  const low = Math.min(layer.size_min, layer.size_max);
  const high = Math.max(layer.size_min, layer.size_max);
  return Array.from({ length: particleCountFor(layer.count, viewportWidth) }, () => {
    const z = random();
    return {
      lane: random(),
      depth: random(),
      z,
      flutter: 1.5 + random() * 2.5,
      phase: random(),
      // Size and speed follow nearness (with a little play), so depth reads at a glance.
      size: low + (high - low) * (0.8 * z + 0.2 * random()),
      speed: Math.max(1, layer.speed) * (0.55 + 0.7 * z) * (0.85 + random() * 0.3),
      spin: (random() - 0.5) * 1.6,
    tilt: random() * Math.PI * 2,
    sway: 6 + random() * 14,
      shape: Math.min(shapeCount - 1, Math.floor(random() * shapeCount)),
      color: pickColor(layer.colors, random()),
    };
  }).sort((a, b) => a.z - b.z); // far marks first, so the near ones are painted over them
}

/** A twinkle's pulse length in seconds: faster `speed`, quicker pulse. */
const twinklePeriod = (speed: number) => Math.min(8, Math.max(1.5, 200 / speed));

/** Seconds one particle takes to complete its loop: one crossing, or one pulse for a TWINKLE. */
export function particlePeriod(particle: OccasionParticle, motion: OccasionMotion, width: number, height: number): number {
  if (motion === 'TWINKLE') return twinklePeriod(particle.speed);
  const travel = (motion === 'DRIFT' ? width : height) + particle.size * 2;
  return travel / particle.speed;
}

const TAU = Math.PI * 2;
const fract = (value: number) => value - Math.floor(value);

/** Where a particle is at `t` seconds on a `width × height` screen. */
export function particlePose(
  particle: OccasionParticle,
  motion: OccasionMotion,
  t: number,
  width: number,
  height: number,
  opacity: number,
): MarkPose {
  const progress = fract(t / particlePeriod(particle, motion, width, height) + particle.phase);
  const sway = Math.sin(t * 0.9 + particle.phase * TAU) * particle.sway;
  const rotation = particle.tilt + particle.spin * t;
  const lane = particle.lane * (motion === 'DRIFT' ? height : width);
  const reach = particle.size * 2 + (motion === 'DRIFT' ? width : height);
  const turn = Math.cos(t * particle.flutter + particle.phase * TAU);
  // A falling or drifting mark tumbles right over (never quite edge-on, or it would vanish);
  // a rising one — a lantern, a heart — only rocks.
  const tumble = 0.15 + 0.85 * Math.abs(turn);
  const alpha = opacity * (0.45 + 0.55 * particle.z);
  switch (motion) {
    case 'FALL':
      return { x: lane + sway, y: -particle.size + progress * reach, rotation, alpha, flip: tumble };
    case 'RISE':
      return { x: lane + sway, y: height + particle.size - progress * reach, rotation, alpha, flip: 0.82 + 0.18 * turn };
    case 'DRIFT':
      return { x: -particle.size + progress * reach, y: lane + sway, rotation, alpha, flip: tumble };
    default:
      return {
        x: lane,
        y: particle.depth * height,
        rotation: particle.tilt + particle.spin * t * 0.3,
        alpha: opacity * (0.6 + 0.4 * particle.z) * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(progress * TAU))),
        flip: 1,
      };
  }
}

/** Seconds after the look appears before its first flyer sets off, so the screen settles first. */
export const FLYER_FIRST_PASS = 2;
/** Each further flyer in a look starts this much later, so two never launch together. */
const FLYER_STAGGER = 4;
/** One bob up and down takes this long, in seconds. */
const BOB_PERIOD = 1.8;

/** A flyer's placement: (x, y) is its box's top-left corner; mirrored when it flies right to left. */
export interface FlyerPose {
  x: number;
  y: number;
  rotation: number;
  mirrored: boolean;
  /** Which pass this is — renderers re-roll anything per pass from it. */
  pass: number;
}

/** Seconds from one pass's start to the next. */
export const flyerCycle = (flyer: Pick<OccasionFlyer, 'duration' | 'interval'>) => Math.max(flyer.interval, flyer.duration, 1);

/**
 * Where the `index`-th flyer is at `t`, or null while it is off screen
 * between passes. Each pass crosses at its own height inside the look's band.
 */
export function flyerPose(
  flyer: Pick<OccasionFlyer, 'direction' | 'altitude_min' | 'altitude_max' | 'size' | 'duration' | 'interval' | 'bob'>,
  t: number,
  width: number,
  height: number,
  index: number,
): FlyerPose | null {
  const elapsed = t - FLYER_FIRST_PASS - index * FLYER_STAGGER;
  if (elapsed < 0) return null;
  const cycle = flyerCycle(flyer);
  const pass = Math.floor(elapsed / cycle);
  const local = elapsed - pass * cycle;
  const duration = Math.max(flyer.duration, 0.5);
  if (local > duration) return null;
  const travelled = (local / duration) * (width + flyer.size);
  const mirrored = flyer.direction === 'RTL';
  const band = flyer.altitude_min + (flyer.altitude_max - flyer.altitude_min) * hash01(pass, index);
  const wave = (local / BOB_PERIOD) * TAU;
  return {
    x: mirrored ? width - travelled : travelled - flyer.size,
    y: (band / 100) * height + Math.sin(wave) * flyer.bob,
    rotation: Math.cos(wave) * 0.06 * (mirrored ? -1 : 1),
    mirrored,
    pass,
  };
}

/** A sparkle left behind a flyer. */
export interface TrailDot {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

const TRAIL_DOTS = 12;
const TRAIL_STEP = 0.05;

/**
 * The dust a flyer leaves: where its tail was over the last half second,
 * fading and shrinking with age. `artHeight` is its drawn height, so the trail
 * leaves from the middle of its back edge.
 */
export function flyerTrail(
  flyer: Parameters<typeof flyerPose>[0],
  t: number,
  width: number,
  height: number,
  index: number,
  artHeight: number,
): TrailDot[] {
  return Array.from({ length: TRAIL_DOTS }, (_, k) => {
    const pose = flyerPose(flyer, t - (k + 1) * TRAIL_STEP, width, height, index);
    if (!pose) return null;
    const age = (k + 1) / TRAIL_DOTS;
    const jitter = (hash01(k, Math.floor(t * 8)) - 0.5) * 8;
    return {
      x: pose.mirrored ? pose.x + flyer.size : pose.x,
      y: pose.y + artHeight * 0.6 + jitter,
      r: 2.6 * (1 - age) + 0.6,
      alpha: 0.9 * (1 - age),
    };
  }).filter((dot): dot is TrailDot => dot !== null);
}

/** How long one firework burst lasts, in seconds. */
export const BURST_LIFE = 1.6;

/** One burst: where and when it went off, and its colour. */
export interface FireworkBurst {
  index: number;
  x: number;
  y: number;
  start: number;
  color: string;
}

/** The bursts lighting the sky at `t`. Each goes off at its own spot in the upper half of the screen. */
export function fireworkBursts(fireworks: OccasionFireworks, t: number, width: number, height: number): FireworkBurst[] {
  if (!fireworks.enabled || fireworks.bursts_per_minute <= 0) return [];
  const period = 60 / fireworks.bursts_per_minute;
  const first = Math.max(0, Math.floor((t - BURST_LIFE) / period));
  const last = Math.floor(t / period);
  const bursts: FireworkBurst[] = [];
  for (let index = first; index <= last; index += 1) {
    const start = index * period + hash01(index, 7) * period * 0.5;
    if (start <= t && t - start < BURST_LIFE) {
      bursts.push({
        index,
        start,
        x: width * (0.12 + 0.76 * hash01(index, 1)),
        y: height * (0.1 + 0.32 * hash01(index, 2)),
        color: pickColor(fireworks.colors, hash01(index, 3)),
      });
    }
  }
  return bursts;
}

/** A firework spark, with where it was a moment ago: the streak a fast spark leaves to the eye. */
export interface Spark extends TrailDot {
  tail_x: number;
  tail_y: number;
}

/** How far back a spark's streak reaches, in seconds. */
const STREAK = 0.07;

/** The sparks of one burst at `t`: flung out fast, slowing, dropping a little and fading. */
export function burstSparks(burst: FireworkBurst, fireworks: Pick<OccasionFireworks, 'sparks' | 'radius'>, t: number): Spark[] {
  const flight = (time: number) => {
    const life = Math.min(1, Math.max(0, (time - burst.start) / BURST_LIFE));
    return { life, reach: fireworks.radius * (1 - (1 - life) ** 3), drop: 26 * life * life };
  };
  const now = flight(t);
  const before = flight(t - STREAK);
  const count = Math.min(60, Math.max(6, Math.round(fireworks.sparks)));
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * TAU + hash01(burst.index, i) * 0.3;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    return {
      x: burst.x + cos * now.reach,
      y: burst.y + sin * now.reach + now.drop,
      tail_x: burst.x + cos * before.reach,
      tail_y: burst.y + sin * before.reach + before.drop,
      r: 2.2 * (1 - now.life * 0.5),
      alpha: 1 - now.life,
    };
  });
}
