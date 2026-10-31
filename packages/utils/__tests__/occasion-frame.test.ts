import { describe, expect, it } from 'vitest';
import type { OccasionDecoration } from '../src/occasion-design';
import { occasionFrame, occasionScene, type OccasionDrawOp, type OccasionScene } from '../src/occasion-frame';
import { FLYER_FIRST_PASS } from '../src/occasion-motion';

const W = 800;
const H = 600;

const FLYER = {
  custom_layers: [],
  image_url: '',
  direction: 'LTR' as const,
  altitude_min: 10,
  altitude_max: 20,
  size: 160,
  duration: 10,
  interval: 20,
  bob: 6,
  trail_color: '',
};

const CHRISTMAS: OccasionDecoration = {
  particles: [
    { shapes: ['SNOWFLAKE', 'CIRCLE'], custom_paths: [], colors: ['#FFFFFF'], motion: 'FALL', count: 30, size_min: 4, size_max: 12, speed: 40, opacity: 1.4 },
  ],
  flyers: [{ ...FLYER, artwork: 'SANTA_SLEIGH', trail_color: '#FFD54F' }],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'STRING_LIGHTS', colors: [] },
};

const kinds = (ops: OccasionDrawOp[]) => ops.map((op) => op.op);

describe('occasionScene', () => {
  it('seeds each swarm for the screen, clamps its opacity and places the garland', () => {
    const scene = occasionScene(CHRISTMAS, W, H);

    expect(scene.layers[0]?.paths).toHaveLength(2);
    expect(scene.layers[0]?.particles.length).toBeGreaterThan(10);
    expect(scene.layers[0]?.opacity).toBe(1);
    expect(scene.flyers[0]?.artwork?.width).toBe(240);
    expect(scene.garland.length).toBeGreaterThan(10);
  });

  it('scatters the same way for the same seed and differently for another', () => {
    const lanes = (scene: OccasionScene) => scene.layers[0]?.particles.map((p) => p.lane);

    expect(lanes(occasionScene(CHRISTMAS, W, H, 5))).toEqual(lanes(occasionScene(CHRISTMAS, W, H, 5)));
    expect(lanes(occasionScene(CHRISTMAS, W, H, 5))).not.toEqual(lanes(occasionScene(CHRISTMAS, W, H, 6)));
  });
});

describe('occasionFrame', () => {
  it('paints snow, then Santa with his trail, then the lights on top', () => {
    const ops = occasionFrame(occasionScene(CHRISTMAS, W, H), FLYER_FIRST_PASS + 3);
    const order = kinds(ops);
    const art = ops.find((op) => op.op === 'art');

    expect(order.indexOf('mark')).toBeLessThan(order.indexOf('dot'));
    expect(order.indexOf('dot')).toBeLessThan(order.indexOf('art'));
    expect(order.lastIndexOf('mark')).toBeGreaterThan(order.indexOf('art'));
    expect(art).toMatchObject({ op: 'art', scale: 160 / 240, mirrored: false });
  });

  it('leaves the flyer out between passes', () => {
    const ops = occasionFrame(occasionScene(CHRISTMAS, W, H), FLYER_FIRST_PASS + 15);

    expect(kinds(ops)).not.toContain('art');
    expect(kinds(ops)).not.toContain('dot');
  });

  it('draws an uploaded image for an IMAGE flyer, trailing from half its width, and nothing without a URL', () => {
    const withImage: OccasionDecoration = {
      ...CHRISTMAS,
      particles: [],
      garland: { style: 'NONE', colors: [] },
      flyers: [{ ...FLYER, artwork: 'IMAGE', image_url: 'https://cdn.example/santa.png', trail_color: '#FFFFFF' }],
    };
    const ops = occasionFrame(occasionScene(withImage, W, H), FLYER_FIRST_PASS + 3);

    expect(ops.find((op) => op.op === 'image')).toMatchObject({ src: 'https://cdn.example/santa.png', width: 160 });
    expect(kinds(ops).filter((kind) => kind === 'dot').length).toBeGreaterThan(0);

    const noUrl = { ...withImage, flyers: [{ ...FLYER, artwork: 'IMAGE' }] };
    expect(occasionFrame(occasionScene(noUrl, W, H), FLYER_FIRST_PASS + 3)).toEqual([]);
  });

  it('lights fireworks as sparks in each burst’s colour', () => {
    const diwali: OccasionDecoration = {
      ...CHRISTMAS,
      particles: [],
      flyers: [],
      garland: { style: 'NONE', colors: [] },
      fireworks: { enabled: true, colors: ['#FFD54F'], bursts_per_minute: 60, sparks: 12, radius: 70 },
    };
    const sparks = Array.from({ length: 30 }, (_, i) => occasionFrame(occasionScene(diwali, W, H), i * 0.2)).flat();

    expect(sparks.length).toBeGreaterThan(0);
    expect(sparks.every((op) => op.op === 'dot' && op.color === '#FFD54F')).toBe(true);
  });

  it('lays each atmosphere under everything else', () => {
    const spooky: OccasionDecoration = {
      ...CHRISTMAS,
      overlays: [
        { style: 'VIGNETTE', color: '#000000', opacity: 0.5 },
        { style: 'GLOW_TOP', color: '#FFB300', opacity: 2 },
        { style: 'FOG', color: '#B9A9D9', opacity: 0.2 },
        { style: 'NONE', color: '#000000', opacity: 1 },
      ],
    };
    const ops = occasionFrame(occasionScene(spooky, W, H), 1);

    expect(kinds(ops).slice(0, 5)).toEqual(['radial', 'linear', 'radial', 'radial', 'radial']);
    expect(ops[0]).toMatchObject({ x: W / 2, y: H / 2, inner_alpha: 0, outer_alpha: 0.5 });
    expect(ops[1]).toMatchObject({ y0: 0, y1: H * 0.35, top_alpha: 1, bottom_alpha: 0 });
  });

  it('drifts the fog banks along over time', () => {
    const foggy: OccasionDecoration = { ...CHRISTMAS, particles: [], flyers: [], garland: { style: 'NONE', colors: [] }, overlays: [{ style: 'FOG', color: '#FFFFFF', opacity: 0.3 }] };
    const scene = occasionScene(foggy, W, H);
    const xAt = (t: number) => (occasionFrame(scene, t)[0] as { x: number }).x;

    expect(xAt(10)).toBeGreaterThan(xAt(0));
  });

  it('draws a particle whose shape is missing as an empty mark rather than throwing', () => {
    const scene = occasionScene(CHRISTMAS, W, H);
    const broken: OccasionScene = {
      ...scene,
      flyers: [],
      garland: [],
      layers: [{ motion: 'FALL', opacity: 1, paths: [], particles: scene.layers[0]?.particles.slice(0, 1) ?? [] }],
    };

    expect(occasionFrame(broken, 0)).toEqual([expect.objectContaining({ op: 'mark', d: '' })]);
  });
});
