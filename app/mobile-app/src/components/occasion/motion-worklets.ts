import type { ViewStyle } from 'react-native';
import {
  FLYER_FIRST_PASS,
  type OccasionFlyer,
  type OccasionMotion,
  type OccasionParticle,
} from '@duncit/utils';

/**
 * UI-thread twins of the occasion engine's clock maths (@duncit/utils
 * occasion-motion, occasion-garland and occasion-frame). The engine is plain
 * JS, which a Reanimated worklet cannot call, so the few lines that turn the
 * clock into a pose are repeated here as worklets — and
 * `__tests__/motion-worklets.test.ts` holds each one equal to the engine.
 * Seeds, periods, paths and layout still come from the engine itself.
 */

const TAU = Math.PI * 2;
/** After a stall the clock moves on by at most this, so nothing jumps (the web runner's MAX_STEP). */
const MAX_STEP = 0.05;
/** Engine: each further flyer in a look starts this much later. */
const FLYER_STAGGER = 4;
/** Engine: one bob up and down takes this long. */
const BOB_PERIOD = 1.8;
/** Engine: the trail looks back this far per dot. */
const TRAIL_STEP = 0.05;
/** Engine: dots in a flyer's trail. */
export const TRAIL_DOTS = 12;
/** Engine: fog banks drifting along the bottom. */
const FOG_BANKS = 3;

export interface Box {
  width: number;
  height: number;
}

/** Seconds the clock moves on for a frame that took `sincePreviousMs`. */
export function clockStep(sincePreviousMs: number | null): number {
  'worklet';
  return Math.min((sincePreviousMs ?? 0) / 1000, MAX_STEP);
}

/** Twin of `hash01`: a stable 0–1 value for an integer and a salt (one mulberry32 draw). */
export function hash01W(n: number, salt: number): number {
  'worklet';
  let t = ((Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface MarkFrame {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  flip: number;
}

/** Twin of `particlePose`; `period` is the engine's `particlePeriod` for this particle. */
export function particleFrame(
  p: OccasionParticle,
  motion: OccasionMotion,
  t: number,
  period: number,
  box: Box,
  opacity: number,
): MarkFrame {
  'worklet';
  const loop = t / period + p.phase;
  const progress = loop - Math.floor(loop);
  const drift = motion === 'DRIFT';
  const sway = Math.sin(t * 0.9 + p.phase * TAU) * p.sway;
  const rotation = p.tilt + p.spin * t;
  const lane = p.lane * (drift ? box.height : box.width);
  const reach = p.size * 2 + (drift ? box.width : box.height);
  const turn = Math.cos(t * p.flutter + p.phase * TAU);
  const tumble = 0.15 + 0.85 * Math.abs(turn);
  const alpha = opacity * (0.45 + 0.55 * p.z);
  if (motion === 'FALL') {
    return { x: lane + sway, y: -p.size + progress * reach, rotation, alpha, flip: tumble };
  }
  if (motion === 'RISE') {
    return {
      x: lane + sway,
      y: box.height + p.size - progress * reach,
      rotation,
      alpha,
      flip: 0.82 + 0.18 * turn,
    };
  }
  if (drift) {
    return { x: -p.size + progress * reach, y: lane + sway, rotation, alpha, flip: tumble };
  }
  const pulse = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(progress * TAU));
  return {
    x: lane,
    y: p.depth * box.height,
    rotation: p.tilt + p.spin * t * 0.3,
    alpha: opacity * (0.6 + 0.4 * p.z) * pulse,
    flip: 1,
  };
}

/** A mark's view placed at its pose: centred on (x, y), turned and squeezed sideways by its tumble. */
export function markStyle(frame: MarkFrame): ViewStyle {
  'worklet';
  return {
    opacity: frame.alpha,
    transform: [
      { translateX: frame.x },
      { translateY: frame.y },
      { rotate: `${frame.rotation}rad` },
      { scaleX: frame.flip },
    ],
  };
}

/** A flyer's timing: its motion fields, the engine's `flyerCycle` and its place in the look. */
export interface FlyerTrack {
  flyer: Pick<
    OccasionFlyer,
    'direction' | 'altitude_min' | 'altitude_max' | 'size' | 'duration' | 'bob'
  >;
  cycle: number;
  index: number;
}

export interface FlyerFrame {
  x: number;
  y: number;
  rotation: number;
}

/** Twin of `flyerPose`: the box's top-left corner and tilt, or null while it is off screen. */
export function flyerFrame(track: FlyerTrack, t: number, box: Box): FlyerFrame | null {
  'worklet';
  const { flyer, cycle, index } = track;
  const elapsed = t - FLYER_FIRST_PASS - index * FLYER_STAGGER;
  if (elapsed < 0) return null;
  const pass = Math.floor(elapsed / cycle);
  const local = elapsed - pass * cycle;
  const duration = Math.max(flyer.duration, 0.5);
  if (local > duration) return null;
  const travelled = (local / duration) * (box.width + flyer.size);
  const mirrored = flyer.direction === 'RTL';
  const band =
    flyer.altitude_min + (flyer.altitude_max - flyer.altitude_min) * hash01W(pass, track.index);
  const wave = (local / BOB_PERIOD) * TAU;
  return {
    x: mirrored ? box.width - travelled : travelled - flyer.size,
    y: (band / 100) * box.height + Math.sin(wave) * flyer.bob,
    rotation: Math.cos(wave) * 0.06 * (mirrored ? -1 : 1),
  };
}

/** A flyer's view at its pose, mirrored when it flies right to left; hidden between passes. */
export function flyerStyle(frame: FlyerFrame | null, mirrored: boolean): ViewStyle {
  'worklet';
  if (!frame) return { opacity: 0 };
  return {
    opacity: 1,
    transform: [
      { translateX: frame.x },
      { translateY: frame.y },
      { rotate: `${frame.rotation}rad` },
      { scaleX: mirrored ? -1 : 1 },
    ],
  };
}

/** The k-th trail dot's fixed size and strength: older dots are smaller and fainter. */
export function trailDotLook(k: number): { r: number; alpha: number } {
  const age = (k + 1) / TRAIL_DOTS;
  return { r: 2.6 * (1 - age) + 0.6, alpha: 0.9 * (1 - age) };
}

/** Twin of one `flyerTrail` dot: where the k-th sparkle behind the flyer is, or null. */
export function trailDotPoint(
  track: FlyerTrack,
  t: number,
  box: Box,
  k: number,
  artHeight: number,
): { x: number; y: number } | null {
  'worklet';
  const pose = flyerFrame(track, t - (k + 1) * TRAIL_STEP, box);
  if (!pose) return null;
  const jitter = (hash01W(k, Math.floor(t * 8)) - 0.5) * 8;
  return {
    x: track.flyer.direction === 'RTL' ? pose.x + track.flyer.size : pose.x,
    y: pose.y + artHeight * 0.6 + jitter,
  };
}

/** A dot's view (drawn centred on its own origin) moved to `point`, at `alpha`; hidden without one. */
export function dotStyle(point: { x: number; y: number } | null, alpha: number): ViewStyle {
  'worklet';
  if (!point) return { opacity: 0 };
  return { opacity: alpha, transform: [{ translateX: point.x }, { translateY: point.y }] };
}

/** Twin of `twinkleAlpha` for a mark that pulses: a slow glow between 45% and full. */
export function twinkleW(phase: number, t: number): number {
  'worklet';
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t / 1.6 + phase) * TAU));
}

/** Twin of the FOG overlay's drift: the centre x of fog bank `bank` at `t`. */
export function fogCentreX(bank: number, t: number, width: number, radius: number): number {
  'worklet';
  const drift = t * 0.012 * (bank + 1) + bank / FOG_BANKS;
  return (drift - Math.floor(drift)) * (width + radius * 2) - radius;
}
