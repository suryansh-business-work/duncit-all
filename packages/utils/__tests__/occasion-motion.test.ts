import { describe, expect, it } from 'vitest';
import {
  BURST_LIFE,
  FLYER_FIRST_PASS,
  MAX_PARTICLES,
  burstSparks,
  fireworkBursts,
  flyerCycle,
  flyerPose,
  flyerTrail,
  particleCountFor,
  particlePeriod,
  particlePose,
  seedParticles,
  type OccasionParticle,
} from '../src/occasion-motion';

const W = 400;
const H = 800;

const LAYER = { count: 40, size_min: 6, size_max: 14, speed: 50, colors: ['#FFFFFF', '#B3E5FC'] };

const particle = (over: Partial<OccasionParticle> = {}): OccasionParticle => ({
  lane: 0.5,
  depth: 0.25,
  z: 1,
  flutter: 0,
  phase: 0,
  size: 10,
  speed: 100,
  spin: 0,
  tilt: 0,
  sway: 0,
  shape: 0,
  color: '#FFFFFF',
  ...over,
});

const FLYER = {
  direction: 'LTR' as const,
  altitude_min: 10,
  altitude_max: 10,
  size: 200,
  duration: 10,
  interval: 30,
  bob: 0,
};

describe('particleCountFor', () => {
  it('gives a desktop the full swarm and a phone a share that never drops below 45%', () => {
    expect(particleCountFor(40, 1440)).toBe(40);
    expect(particleCountFor(40, 2560)).toBe(40);
    expect(particleCountFor(40, 360)).toBe(18);
  });

  it('caps the swarm and never goes negative', () => {
    expect(particleCountFor(10_000, 1440)).toBe(MAX_PARTICLES);
    expect(particleCountFor(-5, 1440)).toBe(0);
  });
});

describe('seedParticles', () => {
  it('scatters the same way for the same seed, inside the layer’s size and colour choices', () => {
    const a = seedParticles(LAYER, 1440, 3, 9);

    expect(a).toEqual(seedParticles(LAYER, 1440, 3, 9));
    expect(a).toHaveLength(40);
    for (const p of a) {
      expect(p.size).toBeGreaterThanOrEqual(6);
      expect(p.size).toBeLessThanOrEqual(14);
      expect(LAYER.colors).toContain(p.color);
      expect(p.shape).toBeGreaterThanOrEqual(0);
      expect(p.shape).toBeLessThan(3);
      expect(p.speed).toBeGreaterThanOrEqual(50 * 0.55 * 0.85);
      expect(p.speed).toBeLessThanOrEqual(50 * 1.25 * 1.15);
    }
  });

  it('paints far marks first, and makes near marks bigger and faster than far ones', () => {
    const swarm = seedParticles({ ...LAYER, count: 160 }, 1440, 1, 11);
    const far = swarm.slice(0, 40);
    const near = swarm.slice(-40);
    const mean = (list: OccasionParticle[], pick: (p: OccasionParticle) => number) => list.reduce((sum, p) => sum + pick(p), 0) / list.length;

    expect(swarm.map((p) => p.z)).toEqual([...swarm.map((p) => p.z)].sort((a, b) => a - b));
    expect(mean(near, (p) => p.size)).toBeGreaterThan(mean(far, (p) => p.size) + 3);
    expect(mean(near, (p) => p.speed)).toBeGreaterThan(mean(far, (p) => p.speed) * 1.5);
  });

  it('reads a reversed size range the right way round', () => {
    const sizes = seedParticles({ ...LAYER, size_min: 20, size_max: 10 }, 1440, 1, 3).map((p) => p.size);

    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
  });

  it('seeds nothing for a layer with no drawable shape', () => {
    expect(seedParticles(LAYER, 1440, 0, 1)).toEqual([]);
  });
});

describe('particlePeriod', () => {
  it('is one crossing of the axis the mark travels along', () => {
    expect(particlePeriod(particle(), 'FALL', W, H)).toBeCloseTo((H + 20) / 100);
    expect(particlePeriod(particle(), 'RISE', W, H)).toBeCloseTo((H + 20) / 100);
    expect(particlePeriod(particle(), 'DRIFT', W, H)).toBeCloseTo((W + 20) / 100);
  });

  it('is a pulse length for a twinkle, kept between 1.5 and 8 seconds', () => {
    expect(particlePeriod(particle({ speed: 100 }), 'TWINKLE', W, H)).toBe(2);
    expect(particlePeriod(particle({ speed: 1 }), 'TWINKLE', W, H)).toBe(8);
    expect(particlePeriod(particle({ speed: 1000 }), 'TWINKLE', W, H)).toBe(1.5);
  });
});

describe('particlePose', () => {
  it('lets a flake fall from just above the screen and come round again at the top', () => {
    const p = particle();
    const period = particlePeriod(p, 'FALL', W, H);

    expect(particlePose(p, 'FALL', 0, W, H, 0.9)).toEqual({ x: 200, y: -10, rotation: 0, alpha: 0.9, flip: 1 });
    expect(particlePose(p, 'FALL', period / 2, W, H, 0.9).y).toBeCloseTo(H / 2);
    expect(particlePose(p, 'FALL', period * 1.0001, W, H, 0.9).y).toBeLessThan(0);
  });

  it('lets a lantern rise from just below the screen', () => {
    const p = particle();

    expect(particlePose(p, 'RISE', 0, W, H, 1).y).toBe(H + 10);
    expect(particlePose(p, 'RISE', 1, W, H, 1).y).toBeCloseTo(H + 10 - 100);
  });

  it('drifts a bat in from the left along its lane', () => {
    const pose = particlePose(particle(), 'DRIFT', 1, W, H, 1);

    expect(pose.x).toBeCloseTo(-10 + 100);
    expect(pose.y).toBe(H / 2);
  });

  it('keeps a twinkle in place while its glow pulses', () => {
    const p = particle({ speed: 100, spin: 1 });
    const a = particlePose(p, 'TWINKLE', 0, W, H, 1);
    const b = particlePose(p, 'TWINKLE', 0.5, W, H, 1);

    expect([a.x, a.y]).toEqual([200, 200]);
    expect([b.x, b.y]).toEqual([200, 200]);
    expect(a.alpha).toBeCloseTo(0.625);
    expect(b.alpha).toBeCloseTo(1);
    expect(b.rotation).toBeCloseTo(0.15);
  });

  it('sways and spins a moving mark', () => {
    const pose = particlePose(particle({ sway: 10, spin: 2, phase: 0.25 }), 'FALL', 1, W, H, 1);

    expect(pose.rotation).toBe(2);
    expect(pose.x).not.toBe(200);
  });

  it('fades a far mark and tumbles a falling one in 3D without letting it vanish edge-on', () => {
    const far = particle({ z: 0, flutter: 2 });
    const flips = Array.from({ length: 60 }, (_, i) => particlePose(far, 'DRIFT', i * 0.05, W, H, 1).flip);

    expect(particlePose(far, 'FALL', 0, W, H, 1).alpha).toBeCloseTo(0.45);
    expect(Math.min(...flips)).toBeGreaterThanOrEqual(0.15);
    expect(Math.min(...flips)).toBeLessThan(0.3);
    expect(Math.max(...flips)).toBeCloseTo(1, 1);
  });

  it('only rocks a rising mark, and never squeezes a twinkle', () => {
    const lantern = particle({ flutter: 2 });
    const rocks = Array.from({ length: 60 }, (_, i) => particlePose(lantern, 'RISE', i * 0.05, W, H, 1).flip);

    expect(Math.min(...rocks)).toBeGreaterThanOrEqual(0.64);
    expect(particlePose(lantern, 'TWINKLE', 0.7, W, H, 1).flip).toBe(1);
  });
});

describe('flyerPose', () => {
  it('waits for the screen to settle before the first pass', () => {
    expect(flyerPose(FLYER, FLYER_FIRST_PASS - 0.1, W, H, 0)).toBeNull();
    expect(flyerPose(FLYER, FLYER_FIRST_PASS + 4 - 0.1, W, H, 1)).toBeNull();
  });

  it('crosses left to right from fully off-screen to fully off-screen, inside its band', () => {
    const start = flyerPose(FLYER, FLYER_FIRST_PASS, W, H, 0);
    const end = flyerPose(FLYER, FLYER_FIRST_PASS + 10, W, H, 0);

    expect(start).toMatchObject({ x: -200, y: 80, mirrored: false, pass: 0 });
    expect(end?.x).toBe(W);
  });

  it('flies right to left mirrored', () => {
    const rtl = { ...FLYER, direction: 'RTL' as const };

    expect(flyerPose(rtl, FLYER_FIRST_PASS, W, H, 0)).toMatchObject({ x: W, mirrored: true });
    expect(flyerPose(rtl, FLYER_FIRST_PASS + 10, W, H, 0)?.x).toBe(-200);
  });

  it('is off screen between passes and back for the next one', () => {
    expect(flyerPose(FLYER, FLYER_FIRST_PASS + 20, W, H, 0)).toBeNull();
    expect(flyerPose(FLYER, FLYER_FIRST_PASS + 31, W, H, 0)?.pass).toBe(1);
  });

  it('bobs gently while it flies', () => {
    const bobbing = { ...FLYER, bob: 10 };
    const ys = [0.2, 0.45, 0.9].map((dt) => flyerPose(bobbing, FLYER_FIRST_PASS + dt, W, H, 0)?.y ?? 0);

    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(5);
  });

  it('never lets the pause between passes be shorter than the crossing', () => {
    expect(flyerCycle({ duration: 20, interval: 5 })).toBe(20);
    expect(flyerCycle({ duration: 0, interval: 0 })).toBe(1);
  });
});

describe('flyerTrail', () => {
  it('leaves fading dust behind the flyer’s back edge', () => {
    const dots = flyerTrail(FLYER, FLYER_FIRST_PASS + 3, W, H, 0, 50);
    const pose = flyerPose(FLYER, FLYER_FIRST_PASS + 3, W, H, 0);

    expect(dots).toHaveLength(12);
    expect(dots[0]?.alpha).toBeGreaterThan(dots[11]?.alpha ?? 1);
    expect(dots.every((dot) => dot.x < (pose?.x ?? 0))).toBe(true);
  });

  it('trails from the right edge when flying right to left, and only for moments it was on screen', () => {
    const rtl = { ...FLYER, direction: 'RTL' as const };
    const dots = flyerTrail(rtl, FLYER_FIRST_PASS + 0.2, W, H, 0, 50);

    expect(dots.length).toBeLessThan(12);
    expect(dots.every((dot) => dot.x >= W)).toBe(true);
  });
});

describe('fireworkBursts', () => {
  const fireworks = { enabled: true, colors: ['#FFD54F', '#FF4081'], bursts_per_minute: 30, sparks: 20, radius: 80 };

  it('lights nothing when switched off or set to no bursts', () => {
    expect(fireworkBursts({ ...fireworks, enabled: false }, 5, W, H)).toEqual([]);
    expect(fireworkBursts({ ...fireworks, bursts_per_minute: 0 }, 5, W, H)).toEqual([]);
  });

  it('sets bursts off in the upper part of the screen, each alive for its lifetime only', () => {
    const seen = new Set<number>();
    for (let t = 0; t < 30; t += 0.1) {
      for (const burst of fireworkBursts(fireworks, t, W, H)) {
        seen.add(burst.index);
        expect(t - burst.start).toBeGreaterThanOrEqual(0);
        expect(t - burst.start).toBeLessThan(BURST_LIFE);
        expect(burst.y).toBeLessThan(H * 0.45);
        expect(burst.x).toBeGreaterThan(W * 0.1);
        expect(fireworks.colors).toContain(burst.color);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(14);
  });
});

describe('burstSparks', () => {
  const burst = { index: 2, x: 100, y: 100, start: 0, color: '#FFD54F' };

  it('starts every spark at the centre, fully bright, with no streak yet', () => {
    const sparks = burstSparks(burst, { sparks: 12, radius: 80 }, 0);

    expect(sparks).toHaveLength(12);
    expect(sparks.every((s) => s.x === 100 && s.y === 100 && s.alpha === 1 && s.tail_x === 100 && s.tail_y === 100)).toBe(true);
  });

  it('streaks each spark back toward the centre along its own line of flight', () => {
    const [spark] = burstSparks(burst, { sparks: 12, radius: 80 }, 0.3);

    expect(spark).toBeDefined();
    const out = Math.hypot((spark?.x ?? 0) - 100, (spark?.y ?? 0) - 100);
    const tail = Math.hypot((spark?.tail_x ?? 0) - 100, (spark?.tail_y ?? 0) - 100);
    expect(tail).toBeGreaterThan(0);
    expect(tail).toBeLessThan(out);
  });

  it('spreads to the full radius and fades out by the end of its life', () => {
    const sparks = burstSparks(burst, { sparks: 12, radius: 80 }, BURST_LIFE);
    const spread = Math.max(...sparks.map((s) => Math.hypot(s.x - 100, s.y - 100 - 26)));

    expect(spread).toBeCloseTo(80);
    expect(sparks.every((s) => s.alpha === 0)).toBe(true);
  });

  it('keeps the spark count between 6 and 60', () => {
    expect(burstSparks(burst, { sparks: 2, radius: 50 }, 0.5)).toHaveLength(6);
    expect(burstSparks(burst, { sparks: 500, radius: 50 }, 0.5)).toHaveLength(60);
  });
});
