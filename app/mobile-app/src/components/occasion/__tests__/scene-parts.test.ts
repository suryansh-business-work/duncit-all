import {
  garlandMarks,
  occasionScene,
  type OccasionDecoration,
  type OccasionFlyer,
  type OccasionOverlay,
} from '@duncit/utils';

import { garlandGroups } from '../garland-groups';
import {
  drawableFlyers,
  overlayParts,
  particleMarks,
  vectorPaint,
  type SceneLayer,
} from '../scene-parts';

const decoration = (overrides: Partial<OccasionDecoration> = {}): OccasionDecoration => ({
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'NONE', colors: [] },
  ...overrides,
});

const flyer = (overrides: Partial<OccasionFlyer>): OccasionFlyer => ({
  artwork: 'KITE',
  custom_layers: [],
  image_url: '',
  direction: 'LTR',
  altitude_min: 10,
  altitude_max: 20,
  size: 80,
  duration: 6,
  interval: 12,
  bob: 4,
  trail_color: '',
  ...overrides,
});

describe('vectorPaint', () => {
  it('fills a piece with its colour and draws no outline it was not given', () => {
    expect(vectorPaint({ fill: '#E53935', stroke: '', stroke_width: 0 })).toEqual({
      fill: '#E53935',
      stroke: 'none',
      strokeWidth: 0,
    });
  });

  it('outlines a stroke-only piece and leaves its inside empty', () => {
    expect(vectorPaint({ fill: '', stroke: '#5D4037', stroke_width: 1.5 })).toEqual({
      fill: 'none',
      stroke: '#5D4037',
      strokeWidth: 1.5,
    });
  });

  it('draws no outline of zero width', () => {
    expect(vectorPaint({ fill: '', stroke: '#5D4037', stroke_width: 0 }).stroke).toBe('none');
  });
});

/** Snow laid out on a phone: one layer of two shapes. */
function snowLayer(): SceneLayer {
  const [layer] = occasionScene(
    decoration({
      particles: [
        {
          shapes: ['SNOWFLAKE', 'STAR'],
          custom_paths: [],
          colors: ['#FFFFFF'],
          motion: 'FALL',
          count: 30,
          size_min: 6,
          size_max: 14,
          speed: 40,
          opacity: 0.9,
        },
      ],
    }),
    390,
    844,
  ).layers;
  if (!layer) throw new Error('the look should lay out one layer');
  return layer;
}

describe('particleMarks', () => {
  const layer = snowLayer();

  it('pairs every particle with the path of its shape, under a stable id', () => {
    const marks = particleMarks(layer);
    expect(marks).toHaveLength(layer.particles.length);
    marks.forEach((mark, n) => {
      expect(mark.id).toBe(`mark-${n}`);
      expect(mark.path).toBe(layer.paths[mark.particle.shape]);
    });
  });

  it('leaves out a particle whose shape has no path to draw', () => {
    const [first, second] = layer.particles;
    if (!first || !second) throw new Error('the layer should have particles');
    const marks = particleMarks({ ...layer, particles: [first, { ...second, shape: 9 }] });
    expect(marks.map((mark) => mark.particle)).toEqual([first]);
  });
});

describe('drawableFlyers', () => {
  it('keeps vector artwork and uploaded pictures, each at its place in the look', () => {
    const scene = occasionScene(
      decoration({
        flyers: [
          flyer({ artwork: 'CUSTOM' }),
          flyer({ artwork: 'SANTA_SLEIGH' }),
          flyer({ artwork: 'IMAGE', image_url: '' }),
          flyer({ artwork: 'IMAGE', image_url: 'https://cdn.duncit.com/occasions/lantern.png' }),
          flyer({ artwork: 'UFO' }),
        ],
      }),
      390,
      844,
    );
    const entries = drawableFlyers(scene);
    expect(entries.map(({ id, index }) => ({ id, index }))).toEqual([
      { id: 'flyer-1', index: 1 },
      { id: 'flyer-3', index: 3 },
    ]);
    expect(entries[0]?.artwork?.width).toBe(240);
    expect(entries[1]?.artwork).toBeNull();
  });
});

describe('overlayParts', () => {
  const partsFor = (overlays: OccasionOverlay[]) =>
    overlayParts(occasionScene(decoration({ overlays }), 390, 844));

  it('lays a vignette out as one still glow round the middle of the screen', () => {
    const [part, ...rest] = partsFor([{ style: 'VIGNETTE', color: '#120A1F', opacity: 0.6 }]);
    expect(rest).toHaveLength(0);
    expect(part).toMatchObject({
      id: 'overlay-0-0',
      drifts: false,
      op: { op: 'radial', x: 195, y: 422, outer_alpha: 0.6 },
    });
  });

  it('lays a top glow out as one fading band', () => {
    expect(partsFor([{ style: 'GLOW_TOP', color: '#FF8F00', opacity: 0.3 }])).toEqual([
      expect.objectContaining({
        drifts: false,
        op: expect.objectContaining({ op: 'linear', y0: 0, top_alpha: 0.3 }),
      }),
    ]);
  });

  it('lays fog out as three drifting banks, after the overlays under it', () => {
    const parts = partsFor([
      { style: 'NONE', color: '#000000', opacity: 1 },
      { style: 'GLOW_TOP', color: '#FF8F00', opacity: 0.3 },
      { style: 'FOG', color: '#B0BEC5', opacity: 0.4 },
    ]);
    expect(parts.map(({ id, drifts, bank }) => ({ id, drifts, bank }))).toEqual([
      { id: 'overlay-1-0', drifts: false, bank: 0 },
      { id: 'overlay-2-0', drifts: true, bank: 0 },
      { id: 'overlay-2-1', drifts: true, bank: 1 },
      { id: 'overlay-2-2', drifts: true, bank: 2 },
    ]);
  });
});

describe('garlandGroups', () => {
  it('keeps a garland that never twinkles as one steady sheet', () => {
    const marks = garlandMarks({ style: 'BUNTING', colors: [] }, 390);
    const groups = garlandGroups(marks);
    expect(groups.twinkles).toEqual([]);
    expect(groups.over).toEqual([]);
    expect(groups.under).toEqual(marks.map((mark, n) => ({ ...mark, id: `mark-${n}` })));
  });

  it('splits string lights into the wire, bulbs grouped by pulse, and the sockets and glints over them', () => {
    const marks = garlandMarks({ style: 'STRING_LIGHTS', colors: [] }, 390);
    const groups = garlandGroups(marks);

    expect(groups.under).toHaveLength(1);
    expect(groups.under[0]?.twinkle).toBeNull();
    expect(groups.over.length).toBeGreaterThan(0);
    expect(groups.over.every((mark) => mark.twinkle === null)).toBe(true);
    const phases = groups.twinkles.map((group) => group.phase);
    expect(phases).toEqual([...phases].sort((a, b) => a - b));
    expect(phases.length).toBeLessThanOrEqual(6);
    for (const group of groups.twinkles) {
      expect(group.marks.every((mark) => mark.twinkle !== null)).toBe(true);
    }
    // Nothing is lost or drawn twice.
    const drawn = [
      ...groups.under,
      ...groups.twinkles.flatMap((group) => group.marks),
      ...groups.over,
    ];
    expect(new Set(drawn.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('has nothing to draw for no garland', () => {
    expect(garlandGroups([])).toEqual({ under: [], twinkles: [], over: [] });
  });
});
