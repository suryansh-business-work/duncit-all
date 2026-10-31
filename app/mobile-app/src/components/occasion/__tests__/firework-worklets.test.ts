import {
  burstSparks,
  fireworkBursts,
  FALLBACK_MARK_COLOR,
  type OccasionFireworks,
} from '@duncit/utils';

import {
  burstPaint,
  burstSlotCount,
  burstSparksW,
  slotBurst,
  type SlotBurst,
} from '../firework-worklets';

/** The slots must light exactly the bursts the engine lights, and each burst's sparks where it puts them. */

const box = { width: 390, height: 844 };
const fireworks: OccasionFireworks = {
  enabled: true,
  colors: ['#FF5252', '#FFD740', '#40C4FF'],
  bursts_per_minute: 40,
  sparks: 24,
  radius: 120,
};

const near = (value: object) =>
  Object.fromEntries(
    Object.entries(value).map(([key, n]) => [
      key,
      typeof n === 'number' ? expect.closeTo(n, 6) : n,
    ]),
  );

/** Every burst the slots have alight at `t`, in burst order. */
function slotted(fw: OccasionFireworks, t: number): SlotBurst[] {
  const slots = burstSlotCount(fw);
  return Array.from({ length: slots }, (_, slot) => slotBurst(fw, slot, slots, t, box))
    .filter((burst) => burst !== null)
    .sort((a, b) => a.index - b.index);
}

describe('burstSlotCount', () => {
  it('keeps no slots when the look has no fireworks', () => {
    expect(burstSlotCount({ ...fireworks, enabled: false })).toBe(0);
    expect(burstSlotCount({ ...fireworks, bursts_per_minute: 0 })).toBe(0);
  });

  it('keeps enough slots for every burst that can overlap', () => {
    expect(burstSlotCount({ ...fireworks, bursts_per_minute: 60 })).toBe(3);
    expect(burstSlotCount({ ...fireworks, bursts_per_minute: 6 })).toBe(2);
  });
});

describe('slotBurst', () => {
  it.each([3, 40, 60])('lights exactly the engine bursts at %i bursts a minute', (perMinute) => {
    const fw = { ...fireworks, bursts_per_minute: perMinute };
    let seen = 0;
    for (let t = 0; t < 45; t += 0.37) {
      const expected = fireworkBursts(fw, t, box.width, box.height);
      seen += expected.length;
      expect(slotted(fw, t)).toEqual(expected.map(near));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('falls back to white when the look gives no colours', () => {
    const fw = { ...fireworks, colors: [], bursts_per_minute: 60 };
    const lit = slotted(fw, 2.9);
    expect(lit.length).toBeGreaterThan(0);
    lit.forEach((burst) => expect(burst.color).toBe(FALLBACK_MARK_COLOR));
  });

  it('has nothing alight before the first burst goes off', () => {
    expect(slotBurst(fireworks, 2, 3, 0, box)).toBeNull();
  });
});

describe('burstSparksW', () => {
  it('flings, slows, drops and fades every spark as the engine does', () => {
    const [burst] = fireworkBursts(
      { ...fireworks, bursts_per_minute: 60 },
      3.5,
      box.width,
      box.height,
    );
    expect(burst).toBeDefined();
    if (!burst) return;
    for (const t of [burst.start, burst.start + 0.05, burst.start + 0.6, burst.start + 1.5]) {
      expect(burstSparksW(burst, fireworks, t)).toEqual(burstSparks(burst, fireworks, t).map(near));
    }
  });

  it('keeps the spark count within what a phone can draw', () => {
    const burst = { index: 0, x: 100, y: 100, start: 0, color: '#FFFFFF' };
    expect(burstSparksW(burst, { sparks: 2, radius: 50 }, 0.5)).toHaveLength(6);
    expect(burstSparksW(burst, { sparks: 400, radius: 50 }, 0.5)).toHaveLength(60);
  });
});

describe('burstPaint', () => {
  const fw = { ...fireworks, bursts_per_minute: 60 };
  const slots = burstSlotCount(fw);
  const half = 160;

  it('paints nothing in a slot with no burst alight', () => {
    const paint = burstPaint(fw, 2, slots, 0, box, half);
    expect(paint).toMatchObject({ streaks: '', halos: '', cores: '', alpha: 0 });
  });

  it('paints the lit burst round its own box centre, with one streak, halo and core per spark', () => {
    const t = 3.5;
    const lit = Array.from({ length: slots }, (_, slot) => ({
      slot,
      burst: slotBurst(fw, slot, slots, t, box),
    })).find((entry) => entry.burst !== null);
    expect(lit?.burst).toBeTruthy();
    if (!lit?.burst) return;
    const sparks = burstSparksW(lit.burst, fw, t);
    const paint = burstPaint(fw, lit.slot, slots, t, box, half);

    expect(paint).toMatchObject({ x: lit.burst.x, y: lit.burst.y, color: lit.burst.color });
    expect(paint.r).toBeCloseTo(sparks[0]?.r ?? Number.NaN, 9);
    expect(paint.alpha).toBeCloseTo(sparks[0]?.alpha ?? Number.NaN, 9);
    const count = (path: string, command: string) => path.split(command).length - 1;
    expect(count(paint.streaks, 'L')).toBe(sparks.length);
    expect(count(paint.cores, 'z')).toBe(sparks.length);
    expect(count(paint.halos, 'z')).toBe(sparks.length);
    const first = sparks[0];
    expect(first).toBeDefined();
    if (!first) return;
    // The first streak starts at the spark's tail, moved into the slot's own box.
    expect(
      paint.streaks.startsWith(
        `M ${first.tail_x + half - lit.burst.x} ${first.tail_y + half - lit.burst.y} L`,
      ),
    ).toBe(true);
  });
});
