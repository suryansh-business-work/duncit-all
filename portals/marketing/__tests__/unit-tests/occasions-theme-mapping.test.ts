import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import { tokens } from '@duncit/theme';
import { LAYER_DEFAULTS } from '../../src/pages/occasions-page/occasion-theme-form/occasion-theme.limits';
import {
  keptPaletteValues,
  themeValues,
  toPreviewDesign,
  toThemeInput,
} from '../../src/pages/occasions-page/occasion-theme-form/occasion-theme.mapping';
import { occasionThemeSchema, pathLines } from '../../src/pages/occasions-page/occasion-theme-form/occasion-theme.schema';
import { newFlyer, newOverlay, newParticle } from '../../src/pages/occasions-page/occasion-theme-form/new-layers';
import { toSixDigitHex } from '../../src/pages/occasions-page/occasion-theme-form/ColorInput';
import type { OccasionThemeFormValues } from '../../src/pages/occasions-page/occasion-theme-form/occasion-theme.types';
import { makeFlyer, makeOccasionTheme, makePalette, makeParticleLayer, makeVectorLayer } from '../mocks/occasions-theme.mock';

afterEach(() => {
  vi.unstubAllGlobals();
});

const blankPalette = themeValues(null).palette_light;

describe('themeValues', () => {
  it('starts a new look as the house look with nothing drawn over it', () => {
    const values = themeValues(null);
    expect(Object.keys(values.palette_light)).toHaveLength(19);
    expect(Object.values(values.palette_light).every((value) => value === '')).toBe(true);
    expect(values).toEqual({
      name: '',
      description: '',
      region: 'CUSTOM',
      color_mode: 'AUTO',
      greeting: '',
      palette_light: blankPalette,
      palette_dark: blankPalette,
      particles: [],
      flyers: [],
      fireworks: { enabled: false, colors: [], ...LAYER_DEFAULTS.fireworks },
      overlays: [],
      garland: { style: 'NONE', colors: [] },
    });
  });

  it('reads a stored look into the editor: ranges as pairs, paths as lines, no NONE wash and no __typename', () => {
    const theme = makeOccasionTheme({
      particles: [makeParticleLayer({ custom_paths: ['M0 0', 'L1 1'], size_min: 4, size_max: 9 })],
      flyers: [makeFlyer({ artwork: 'CUSTOM', custom_layers: [makeVectorLayer()], altitude_min: 5, altitude_max: 40 })],
      overlays: [
        { __typename: 'OccasionOverlay', style: 'NONE', color: '', opacity: 0 },
        { __typename: 'OccasionOverlay', style: 'FOG', color: '#111111', opacity: 0.3 },
      ],
      fireworks: { __typename: 'OccasionFireworks', enabled: true, colors: ['#FFD54F'], bursts_per_minute: 20, sparks: 30, radius: 100 },
      garland: { __typename: 'OccasionGarland', style: 'BUNTING', colors: ['#FF0000'] },
    });
    const values = themeValues(theme);
    expect(values.name).toBe('Christmas');
    expect(values.region).toBe('WESTERN');
    expect(values.palette_light).toEqual({ ...blankPalette, brand: '#8E1B3A', primary: '#000000', onPrimary: '#FFFFFF', accent: '#777777', onAccent: '#888888' });
    expect(values.particles).toEqual([
      { shapes: ['SNOWFLAKE'], custom_paths: 'M0 0\nL1 1', colors: ['#FFFFFF'], motion: 'FALL', count: 40, size: [4, 9], speed: 40, opacity: 0.9 },
    ]);
    expect(values.flyers[0]).toMatchObject({
      artwork: 'CUSTOM',
      custom_layers: [{ path: 'M0 0L10 10', fill: '#FF0000', stroke: '', stroke_width: 2, x: 0, y: 0 }],
      altitude: [5, 40],
    });
    expect(values.flyers[0].custom_layers[0]).not.toHaveProperty('__typename');
    expect(values.fireworks).toEqual({ enabled: true, colors: ['#FFD54F'], bursts_per_minute: 20, sparks: 30, radius: 100 });
    expect(values.overlays).toEqual([{ style: 'FOG', color: '#111111', opacity: 0.3 }]);
    expect(values.garland).toEqual({ style: 'BUNTING', colors: ['#FF0000'] });
    // The editor's lists are its own copies, never the cached server arrays.
    values.garland.colors.push('#000000');
    expect(theme.garland.colors).toEqual(['#FF0000']);
  });
});

describe('keptPaletteValues', () => {
  it('keeps only the non-hex values a stored look already carries, from both modes', () => {
    expect(keptPaletteValues(null).size).toBe(0);
    const theme = makeOccasionTheme({
      palette_light: makePalette({ primary: '#000000', border: 'rgba(0,0,0,0.4)' }),
      palette_dark: makePalette({ ink: 'tomato', bg: '#123' }),
    });
    expect([...keptPaletteValues(theme)]).toEqual(['rgba(0,0,0,0.4)', 'tomato']);
  });
});

/** A look as the editor might hold it while being typed into. */
function editedValues(): OccasionThemeFormValues {
  return {
    name: '  Diwali  ',
    description: ' Lights ',
    region: 'INDIAN',
    color_mode: 'DARK',
    greeting: '  Happy Diwali ',
    palette_light: { ...blankPalette, primary: ' #FFAA00 ', ink: 'rgba(0,0,0,0.5)', bg: 'nope' },
    palette_dark: { ...blankPalette, brand: '#abc ' },
    particles: [
      {
        shapes: ['DIYA'],
        custom_paths: '  M0 0 \n\n hello \n L1 1 ',
        colors: [' #FFD54F ', 'red'],
        motion: 'RISE',
        count: 30.4,
        size: [14, 6],
        speed: 50,
        opacity: 0.8,
      },
    ],
    flyers: [
      { ...newFlyer(), artwork: 'IMAGE', image_url: ' https://ik.imagekit.io/duncit/kite.png ', altitude: [40, 10], interval: 5, duration: 12, trail_color: ' #abc ' },
      { ...newFlyer(), artwork: 'KITE', image_url: 'https://left.behind/old.png', trail_color: 'zz' },
      { ...newFlyer(), artwork: 'IMAGE', image_url: 'http://not.secure/a.png' },
    ],
    fireworks: { enabled: true, colors: [' #FF0000 ', 'blue'], bursts_per_minute: 12, sparks: 28.6, radius: 90 },
    overlays: [
      { style: 'GLOW_TOP', color: ' #FFAA00 ', opacity: 0.2 },
      { style: 'FOG', color: 'half', opacity: 0.4 },
    ],
    garland: { style: 'STRING_LIGHTS', colors: [' #00FF00 ', 'green'] },
  };
}

describe('toThemeInput', () => {
  it('sends the whole look trimmed, ranges ordered, whole counts, and only an image flyer keeps its image', () => {
    const input = toThemeInput(editedValues());
    expect(input).toMatchObject({ name: 'Diwali', description: 'Lights', region: 'INDIAN', color_mode: 'DARK', greeting: 'Happy Diwali' });
    expect(input.palette_light).toMatchObject({ primary: '#FFAA00', bg: 'nope', brand: '' });
    expect(input.palette_dark).toMatchObject({ brand: '#abc' });
    expect(input.particles).toEqual([
      {
        shapes: ['DIYA'],
        custom_paths: ['M0 0', 'hello', 'L1 1'],
        colors: ['#FFD54F', 'red'],
        motion: 'RISE',
        count: 30,
        size_min: 6,
        size_max: 14,
        speed: 50,
        opacity: 0.8,
      },
    ]);
    const [image, kite] = input.flyers ?? [];
    expect(image).toMatchObject({ artwork: 'IMAGE', image_url: 'https://ik.imagekit.io/duncit/kite.png', altitude_min: 10, altitude_max: 40, trail_color: '#abc' });
    // A flyer never comes round before it has crossed.
    expect(image.interval).toBe(12);
    expect(kite).toMatchObject({ artwork: 'KITE', image_url: '', interval: 30, trail_color: 'zz' });
    expect(input.fireworks).toEqual({ enabled: true, colors: ['#FF0000', 'blue'], bursts_per_minute: 12, sparks: 29, radius: 90 });
    expect(input.overlays).toEqual([
      { style: 'GLOW_TOP', color: '#FFAA00', opacity: 0.2 },
      { style: 'FOG', color: 'half', opacity: 0.4 },
    ]);
    expect(input.garland).toEqual({ style: 'STRING_LIGHTS', colors: ['#00FF00', 'green'] });
  });
});

describe('toPreviewDesign', () => {
  it('hands the canvas only what it can draw, and names an untitled look', () => {
    vi.stubGlobal('CSS', { supports: (_property: string, value: string) => value.startsWith('rgba(') });
    const design = toPreviewDesign({ ...editedValues(), name: '   ' }, 'Untitled look');
    expect(design.key).toBe('preview');
    expect(design.name).toBe('Untitled look');
    expect(design.greeting).toBe('Happy Diwali');
    expect(design.color_mode).toBe('DARK');
    // A stored rgba token still paints; a half-typed one is left to the house colour.
    expect(design.palette_light).toMatchObject({ primary: '#FFAA00', ink: 'rgba(0,0,0,0.5)', bg: '', brand: '' });
    expect(design.palette_dark).toMatchObject({ brand: '#abc' });
    expect(design.particles[0]).toMatchObject({ custom_paths: ['M0 0', 'L1 1'], colors: ['#FFD54F'], count: 30.4, size_min: 6, size_max: 14 });
    const [image, kite, insecure] = design.flyers;
    expect(image).toMatchObject({ image_url: 'https://ik.imagekit.io/duncit/kite.png', interval: 12, altitude_min: 10, altitude_max: 40, trail_color: '#abc' });
    expect(kite).toMatchObject({ image_url: '', trail_color: '' });
    expect(insecure.image_url).toBe('');
    expect(design.fireworks).toEqual({ enabled: true, colors: ['#FF0000'], bursts_per_minute: 12, sparks: 28.6, radius: 90 });
    expect(design.overlays).toEqual([
      { style: 'GLOW_TOP', color: '#FFAA00', opacity: 0.2 },
      { style: 'FOG', color: tokens.common.black, opacity: 0.4 },
    ]);
    expect(design.garland).toEqual({ style: 'STRING_LIGHTS', colors: ['#00FF00'] });
  });

  it('keeps a typed name, and drops a non-hex token where the browser cannot say it is a colour', () => {
    vi.stubGlobal('CSS', undefined);
    const design = toPreviewDesign(editedValues(), 'Untitled look');
    expect(design.name).toBe('Diwali');
    expect(design.palette_light.ink).toBe('');
    expect(design.palette_light.primary).toBe('#FFAA00');
  });
});

describe('new layers', () => {
  it('start from the server defaults, in the look’s colour, with ranges of their own', () => {
    const particle = newParticle('#8E1B3A');
    expect(particle).toEqual({ shapes: ['SPARK'], custom_paths: '', colors: ['#8E1B3A'], motion: 'FALL', count: 30, size: [6, 14], speed: 40, opacity: 0.9 });
    expect(particle.size).not.toBe(LAYER_DEFAULTS.particle.size);
    const flyer = newFlyer();
    expect(flyer).toEqual({
      artwork: 'SHOOTING_STAR',
      custom_layers: [],
      image_url: '',
      direction: 'LTR',
      altitude: [10, 25],
      size: 160,
      duration: 12,
      interval: 30,
      bob: 8,
      trail_color: '',
    });
    expect(flyer.altitude).not.toBe(LAYER_DEFAULTS.flyer.altitude);
    expect(newOverlay('#123456')).toEqual({ style: 'GLOW_TOP', color: '#123456', opacity: 0.2 });
  });
});

describe('toSixDigitHex', () => {
  it('widens #rgb, keeps #rrggbb, and falls back for anything else', () => {
    expect(toSixDigitHex('#abc')).toBe('#aabbcc');
    expect(toSixDigitHex(' #A1B2C3 ')).toBe('#A1B2C3');
    expect(toSixDigitHex('nope')).toBe(tokens.common.black);
    expect(toSixDigitHex('', '#123456')).toBe('#123456');
  });
});

const translator = () => renderHook(() => useTranslation()).result.current;

/** Each issue as `path: message`, the way the form shows it beside its field. */
function issuesOf(values: unknown, kept: ReadonlySet<string> = new Set()): string[] {
  const result = occasionThemeSchema(translator().t, kept).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

const validValues = (): OccasionThemeFormValues => themeValues(makeOccasionTheme());

describe('pathLines', () => {
  it('splits a block into trimmed lines and drops the blank ones', () => {
    expect(pathLines(' M0 0 \n\n\tL1 1\n ')).toEqual(['M0 0', 'L1 1']);
    expect(pathLines('')).toEqual([]);
  });
});

describe('occasionThemeSchema', () => {
  it('accepts a stored look as it is, and a non-hex token the server already keeps', () => {
    expect(issuesOf(validValues())).toEqual([]);
    const values = validValues();
    values.palette_light.border = 'rgba(0,0,0,0.4)';
    expect(issuesOf(values, new Set(['rgba(0,0,0,0.4)']))).toEqual([]);
    expect(issuesOf(values)).toEqual(['palette_light.border: Enter a hex colour like #8E1B3A, or leave it blank.']);
  });

  it('says what is wrong with the basics', () => {
    expect(issuesOf({ ...validValues(), name: '   ' })).toEqual(['name: Give the look a name.']);
    expect(issuesOf({ ...validValues(), name: 'x'.repeat(61), description: 'x'.repeat(281), greeting: 'x'.repeat(81) })).toEqual([
      'name: Keep the name under 60 characters.',
      'description: Keep this under 280 characters.',
      'greeting: Keep this under 80 characters.',
    ]);
  });

  it('needs a particle layer to draw something, in colours, with paths that are only path data', () => {
    const base = validValues().particles[0];
    const check = (layer: Partial<typeof base>) => issuesOf({ ...validValues(), particles: [{ ...base, ...layer }] });
    expect(check({ shapes: [], custom_paths: '' })).toEqual(['particles.0.shapes: Pick at least one shape or add a path of your own.']);
    // A path of its own is enough on its own.
    expect(check({ shapes: [], custom_paths: 'M0 0L10 10' })).toEqual([]);
    expect(check({ custom_paths: Array.from({ length: 7 }, () => 'M0 0').join('\n') })).toEqual(['particles.0.custom_paths: Keep at most 6.']);
    const pathInvalid = 'particles.0.custom_paths: Paths may only hold SVG path commands and numbers, up to 4000 characters each.';
    expect(check({ custom_paths: 'M0 0\nhello' })).toEqual([pathInvalid]);
    expect(check({ custom_paths: `M${'1'.repeat(4000)}` })).toEqual([pathInvalid]);
    expect(check({ colors: [] })).toEqual(['particles.0.colors: Add at least one colour.']);
    expect(check({ colors: Array.from({ length: 9 }, () => '#FFFFFF') })).toEqual(['particles.0.colors: Keep at most 8.']);
    expect(check({ colors: ['red'] })).toEqual(['particles.0.colors.0: Enter a hex colour like #FFD54F.']);
    expect(check({ count: 10.5 })).toEqual(['particles.0.count: Enter a whole number.']);
    expect(check({ count: 161, opacity: 0, size: [1, 6] })).toEqual([
      'particles.0.count: Enter a number from 0 to 160.',
      'particles.0.size.0: Enter a number from 2 to 120.',
      'particles.0.opacity: Enter a number from 0.05 to 1.',
    ]);
  });

  it('needs an image flyer to have an https image, and every flyer to cross before it comes round again', () => {
    const base = validValues().flyers[0];
    const check = (flyer: Partial<typeof base>) => issuesOf({ ...validValues(), flyers: [{ ...base, ...flyer }] });
    expect(check({ artwork: 'IMAGE', image_url: '' })).toEqual(['flyers.0.image_url: Upload an image. It must be an https link.']);
    expect(check({ artwork: 'IMAGE', image_url: 'HTTPS://ik.imagekit.io/duncit/a.png' })).toEqual([]);
    // An image left from before is not checked once the artwork is a drawing again.
    expect(check({ artwork: 'KITE', image_url: 'ftp://old' })).toEqual([]);
    expect(check({ interval: 5, duration: 12 })).toEqual(['flyers.0.interval: Set the gap to at least the crossing time.']);
    expect(check({ trail_color: 'zz' })).toEqual(['flyers.0.trail_color: Enter a hex colour like #FFD54F.']);
    expect(check({ image_url: 'x'.repeat(2001) })).toEqual(['flyers.0.image_url: Keep this under 2000 characters.']);
  });

  it('needs fireworks that are on to have a colour, and whole sparks', () => {
    const base = validValues().fireworks;
    expect(issuesOf({ ...validValues(), fireworks: { ...base, enabled: true, colors: [] } })).toEqual(['fireworks.colors: Add at least one colour.']);
    expect(issuesOf({ ...validValues(), fireworks: { ...base, enabled: false, colors: [] } })).toEqual([]);
    expect(issuesOf({ ...validValues(), fireworks: { ...base, enabled: true, colors: ['#FF0000'], sparks: 6.5 } })).toEqual([
      'fireworks.sparks: Enter a whole number.',
    ]);
  });

  it('keeps every list within what the server stores', () => {
    const values = validValues();
    const wash = { style: 'FOG' as const, color: '', opacity: 0.2 };
    expect(
      issuesOf({
        ...values,
        particles: Array.from({ length: 5 }, () => values.particles[0]),
        flyers: Array.from({ length: 4 }, () => values.flyers[0]),
        overlays: [wash, wash, wash, wash],
      }),
    ).toEqual(['particles: Keep at most 4.', 'flyers: Keep at most 3.', 'overlays: Keep at most 3.']);
    expect(issuesOf({ ...values, overlays: [{ ...wash, color: 'grey' }] })).toEqual(['overlays.0.color: Enter a hex colour like #FFD54F.']);
  });
});
