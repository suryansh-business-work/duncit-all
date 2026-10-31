import { BURST_LIFE, FALLBACK_MARK_COLOR, type OccasionFireworks } from '@duncit/utils';

import { hash01W, type Box } from './motion-worklets';

/**
 * UI-thread twins of the engine's `fireworkBursts` and `burstSparks`
 * (@duncit/utils occasion-motion), held equal to it by
 * `__tests__/firework-worklets.test.ts`. Bursts are kept in a few slots: one
 * burst every period, each alight for BURST_LIFE, so slot `i % slots` never
 * has two at once.
 */

const TAU = Math.PI * 2;
/** Engine: how far back a spark's streak reaches, in seconds. */
const STREAK = 0.07;
/** Engine: how far a spark drops over its life, in px. */
const DROP = 26;
/** Room round a burst's reach for that drop and a spark's glow. */
export const BURST_MARGIN = DROP + 12;

export type FireworksSpec = Pick<
  OccasionFireworks,
  'colors' | 'bursts_per_minute' | 'sparks' | 'radius'
>;

/** How many bursts can be alight at once — the slots a renderer keeps; 0 when fireworks are off. */
export function burstSlotCount(fireworks: OccasionFireworks): number {
  if (!fireworks.enabled || fireworks.bursts_per_minute <= 0) return 0;
  return Math.floor(BURST_LIFE / (60 / fireworks.bursts_per_minute)) + 2;
}

export interface SlotBurst {
  index: number;
  x: number;
  y: number;
  start: number;
  color: string;
}

/** Twin of `fireworkBursts`, one slot at a time: the burst alight in `slot` of `slots` at `t`, or null. */
export function slotBurst(
  fireworks: FireworksSpec,
  slot: number,
  slots: number,
  t: number,
  box: Box,
): SlotBurst | null {
  'worklet';
  const period = 60 / fireworks.bursts_per_minute;
  const last = Math.floor(t / period);
  const index = last - ((((last - slot) % slots) + slots) % slots);
  if (index < 0) return null;
  const start = index * period + hash01W(index, 7) * period * 0.5;
  if (start > t || t - start >= BURST_LIFE) return null;
  const { colors } = fireworks;
  const pick = Math.min(colors.length - 1, Math.floor(hash01W(index, 3) * colors.length));
  return {
    index,
    start,
    x: box.width * (0.12 + 0.76 * hash01W(index, 1)),
    y: box.height * (0.1 + 0.32 * hash01W(index, 2)),
    color: colors[pick] ?? FALLBACK_MARK_COLOR,
  };
}

export interface SparkW {
  x: number;
  y: number;
  tail_x: number;
  tail_y: number;
  r: number;
  alpha: number;
}

/** Twin of `burstSparks`: flung out fast, slowing, dropping a little and fading. */
export function burstSparksW(
  burst: SlotBurst,
  fireworks: Pick<FireworksSpec, 'sparks' | 'radius'>,
  t: number,
): SparkW[] {
  'worklet';
  const lifeAt = (time: number) => Math.min(1, Math.max(0, (time - burst.start) / BURST_LIFE));
  const reach = (life: number) => fireworks.radius * (1 - (1 - life) ** 3);
  const now = lifeAt(t);
  const before = lifeAt(t - STREAK);
  const count = Math.min(60, Math.max(6, Math.round(fireworks.sparks)));
  const sparks: SparkW[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + hash01W(burst.index, i) * 0.3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    sparks.push({
      x: burst.x + cos * reach(now),
      y: burst.y + sin * reach(now) + DROP * now * now,
      tail_x: burst.x + cos * reach(before),
      tail_y: burst.y + sin * reach(before) + DROP * before * before,
      r: 2.2 * (1 - now * 0.5),
      alpha: 1 - now,
    });
  }
  return sparks;
}

/** What one slot paints: its burst's centre and colour, and the sparks as path data in its own box. */
export interface BurstPaint {
  x: number;
  y: number;
  color: string;
  streaks: string;
  halos: string;
  cores: string;
  r: number;
  alpha: number;
}

const DARK_SLOT: BurstPaint = {
  x: 0,
  y: 0,
  color: FALLBACK_MARK_COLOR,
  streaks: '',
  halos: '',
  cores: '',
  r: 0,
  alpha: 0,
};

/** A disc of radius r centred on (x, y), as path data. */
function disc(x: number, y: number, r: number): string {
  'worklet';
  return ['M', x - r, y, 'a', r, r, 0, 1, 0, r * 2, 0, 'a', r, r, 0, 1, 0, -r * 2, 0, 'z '].join(
    ' ',
  );
}

/**
 * One slot at `t`, drawn the way the web painter draws a spark — a streak
 * back to where it was, a faint halo and a bright core — in a box `2 × half`
 * wide centred on the burst. A slot with nothing alight paints nothing.
 */
export function burstPaint(
  fireworks: FireworksSpec,
  slot: number,
  slots: number,
  t: number,
  box: Box,
  half: number,
): BurstPaint {
  'worklet';
  const burst = slotBurst(fireworks, slot, slots, t, box);
  if (!burst) return DARK_SLOT;
  const dx = half - burst.x;
  const dy = half - burst.y;
  let streaks = '';
  let halos = '';
  let cores = '';
  let r = 0;
  let alpha = 0;
  for (const spark of burstSparksW(burst, fireworks, t)) {
    streaks += [
      'M',
      spark.tail_x + dx,
      spark.tail_y + dy,
      'L',
      spark.x + dx,
      spark.y + dy,
      '',
    ].join(' ');
    halos += disc(spark.x + dx, spark.y + dy, spark.r * 2.4);
    cores += disc(spark.x + dx, spark.y + dy, spark.r);
    r = spark.r;
    alpha = spark.alpha;
  }
  return { x: burst.x, y: burst.y, color: burst.color, streaks, halos, cores, r, alpha };
}
