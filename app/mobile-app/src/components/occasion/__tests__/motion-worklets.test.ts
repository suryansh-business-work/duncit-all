import {
  flyerCycle,
  flyerPose,
  flyerTrail,
  hash01,
  occasionFrame,
  occasionScene,
  particlePeriod,
  particlePose,
  seedParticles,
  twinkleAlpha,
  type OccasionDecoration,
  type OccasionFlyer,
  type OccasionMotion,
  type RadialOp,
} from '@duncit/utils';

import {
  TRAIL_DOTS,
  clockStep,
  dotStyle,
  flyerFrame,
  flyerStyle,
  fogCentreX,
  hash01W,
  markStyle,
  particleFrame,
  trailDotLook,
  trailDotPoint,
  twinkleW,
  type FlyerTrack,
} from '../motion-worklets';

/** These worklets are the UI-thread copies of the engine: every one must land where the engine does. */

const box = { width: 390, height: 844 };
const INSTANTS = [0, 0.4, 2, 3.7, 6.05, 12.25, 30, 95.5];

/** The same numbers, give or take floating-point dust. */
const near = (pose: object) =>
  Object.fromEntries(
    Object.entries(pose).map(([key, value]) => [key, expect.closeTo(Number(value), 6)]),
  );

const flyer: OccasionFlyer = {
  artwork: 'SANTA_SLEIGH',
  custom_layers: [],
  image_url: '',
  direction: 'LTR',
  altitude_min: 10,
  altitude_max: 30,
  size: 160,
  duration: 8,
  interval: 20,
  bob: 6,
  trail_color: '#FFD54F',
};
const trackOf = (f: OccasionFlyer, index: number): FlyerTrack => ({
  flyer: f,
  cycle: flyerCycle(f),
  index,
});

describe('clockStep', () => {
  it('moves the clock on by the frame time, in seconds', () => {
    expect(clockStep(16)).toBeCloseTo(0.016, 9);
  });

  it('caps a stalled frame so nothing jumps after a pause in rendering', () => {
    expect(clockStep(4000)).toBe(0.05);
  });

  it('does not move on the very first frame', () => {
    expect(clockStep(null)).toBe(0);
  });
});

describe('hash01W', () => {
  it('gives exactly the engine hash for every burst, pass and bulb number', () => {
    for (let n = 0; n < 60; n += 1) {
      for (const salt of [0, 1, 2, 3, 5, 7, 11]) expect(hash01W(n, salt)).toBe(hash01(n, salt));
    }
  });
});

describe('particleFrame', () => {
  const particles = seedParticles(
    { count: 40, size_min: 6, size_max: 26, speed: 80, colors: ['#FFFFFF'] },
    box.width,
    3,
    7,
  );

  it.each<OccasionMotion>(['FALL', 'RISE', 'DRIFT', 'TWINKLE'])(
    'poses every %s mark where the engine does',
    (motion) => {
      for (const particle of particles) {
        const period = particlePeriod(particle, motion, box.width, box.height);
        for (const t of INSTANTS) {
          const expected = particlePose(particle, motion, t, box.width, box.height, 0.8);
          expect(particleFrame(particle, motion, t, period, box, 0.8)).toEqual(near(expected));
        }
      }
    },
  );

  it('places a mark centred on its pose, turned and squeezed by its tumble', () => {
    expect(markStyle({ x: 12, y: 40, rotation: 0.5, alpha: 0.6, flip: 0.3 })).toEqual({
      opacity: 0.6,
      transform: [{ translateX: 12 }, { translateY: 40 }, { rotate: '0.5rad' }, { scaleX: 0.3 }],
    });
  });
});

describe('flyerFrame', () => {
  it.each(['LTR', 'RTL'] as const)(
    'crosses %s exactly as the engine flyer does, off screen between passes',
    (direction) => {
      const f = { ...flyer, direction };
      for (const index of [0, 1, 2]) {
        for (const t of [...INSTANTS, 9.9, 10.5, 14, 22.3, 31, 47.2, 63.9]) {
          const expected = flyerPose(f, t, box.width, box.height, index);
          const frame = flyerFrame(trackOf(f, index), t, box);
          const want = expected
            ? near({ x: expected.x, y: expected.y, rotation: expected.rotation })
            : null;
          expect(frame).toEqual(want);
        }
      }
    },
  );

  it('waits for the first pass before setting off', () => {
    expect(flyerFrame(trackOf(flyer, 0), 1.9, box)).toBeNull();
    expect(flyerFrame(trackOf(flyer, 0), 2.5, box)).not.toBeNull();
  });

  it('hides the flyer between passes and mirrors one flying right to left', () => {
    expect(flyerStyle(null, false)).toEqual({ opacity: 0 });
    const frame = { x: 30, y: 80, rotation: -0.04 };
    expect(flyerStyle(frame, true)).toEqual({
      opacity: 1,
      transform: [{ translateX: 30 }, { translateY: 80 }, { rotate: '-0.04rad' }, { scaleX: -1 }],
    });
    expect(flyerStyle(frame, false).transform).toContainEqual({ scaleX: 1 });
  });
});

describe('the sparkle trail', () => {
  const twinTrail = (f: OccasionFlyer, t: number, artHeight: number) =>
    Array.from({ length: TRAIL_DOTS }, (_, k) => {
      const point = trailDotPoint(trackOf(f, 0), t, box, k, artHeight);
      return point ? { ...point, ...trailDotLook(k) } : null;
    }).filter((dot) => dot !== null);

  it.each([
    ['in full flight', 'LTR', 6],
    ['just after setting off, half the trail not yet laid', 'LTR', 2.2],
    ['flying right to left', 'RTL', 7.3],
  ] as const)('matches the engine trail %s', (_, direction, t) => {
    const f = { ...flyer, direction };
    const expected = flyerTrail(f, t, box.width, box.height, 0, 53);
    expect(expected.length).toBeGreaterThan(0);
    expect(twinTrail(f, t, 53)).toEqual(expected.map(near));
  });

  it('hides a dot with no flyer to follow and moves one that has', () => {
    expect(dotStyle(null, 0.5)).toEqual({ opacity: 0 });
    expect(dotStyle({ x: 4, y: 9 }, 0.5)).toEqual({
      opacity: 0.5,
      transform: [{ translateX: 4 }, { translateY: 9 }],
    });
  });
});

describe('twinkleW', () => {
  it('pulses a bulb exactly like the engine garland', () => {
    for (const phase of [0, 0.25, 0.5, 0.83]) {
      for (const t of INSTANTS) expect(twinkleW(phase, t)).toBeCloseTo(twinkleAlpha(phase, t), 9);
    }
  });
});

describe('fogCentreX', () => {
  const decoration: OccasionDecoration = {
    particles: [],
    flyers: [],
    fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
    overlays: [{ style: 'FOG', color: '#B0BEC5', opacity: 0.4 }],
    garland: { style: 'NONE', colors: [] },
  };
  const scene = occasionScene(decoration, box.width, box.height);

  it('drifts every fog bank to where the engine draws it', () => {
    for (const t of INSTANTS) {
      const banks = occasionFrame(scene, t).filter((op): op is RadialOp => op.op === 'radial');
      expect(banks).toHaveLength(3);
      banks.forEach((op, bank) =>
        expect(fogCentreX(bank, t, box.width, op.radius)).toBeCloseTo(op.x, 6),
      );
    }
  });
});
