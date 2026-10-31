import { describe, expect, it } from 'vitest';
import {
  colorWithAlpha,
  hasOccasionDecoration,
  isOccasionAnimated,
  occasionColorMode,
  occasionPalettes,
  type OccasionDecoration,
} from '../src/occasion-design';

const PLAIN: OccasionDecoration = {
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'NONE', colors: [] },
};

const SNOW = {
  shapes: ['SNOWFLAKE'],
  custom_paths: [],
  colors: ['#FFFFFF'],
  motion: 'FALL' as const,
  count: 40,
  size_min: 4,
  size_max: 12,
  speed: 40,
  opacity: 0.9,
};

const SANTA = {
  artwork: 'SANTA_SLEIGH',
  custom_layers: [],
  image_url: '',
  direction: 'LTR' as const,
  altitude_min: 8,
  altitude_max: 20,
  size: 200,
  duration: 12,
  interval: 30,
  bob: 8,
  trail_color: '#FFD54F',
};

describe('occasionColorMode', () => {
  it("keeps the viewer's own mode when there is no look, or the look leaves the mode to them", () => {
    expect(occasionColorMode('light')).toBe('light');
    expect(occasionColorMode('dark', null)).toBe('dark');
    expect(occasionColorMode('dark', { color_mode: 'AUTO' })).toBe('dark');
  });

  it('paints in the mode a look pins, whatever the viewer chose', () => {
    expect(occasionColorMode('light', { color_mode: 'DARK' })).toBe('dark');
    expect(occasionColorMode('dark', { color_mode: 'LIGHT' })).toBe('light');
  });
});

describe('occasionPalettes', () => {
  const palettes = {
    light: { primary: '#D92D2D', bg: '#F2F3EF' },
    dark: { primary: '#D92D2D', bg: '#0E1012' },
  };

  it('hands back the very same palettes without a look, so a memoised theme is not rebuilt', () => {
    expect(occasionPalettes(palettes)).toBe(palettes);
    expect(occasionPalettes(palettes, null)).toBe(palettes);
  });

  it("writes each mode's filled-in tokens over the app's and keeps the rest", () => {
    const next = occasionPalettes(palettes, {
      palette_light: { primary: '#1B6B3A', bg: '' },
      palette_dark: { primary: '#2E9D58', bg: null },
    });

    expect(next).toEqual({
      light: { primary: '#1B6B3A', bg: '#F2F3EF' },
      dark: { primary: '#2E9D58', bg: '#0E1012' },
    });
  });
});

describe('isOccasionAnimated', () => {
  it('is false for a look that only recolours, or whose swarm has no marks', () => {
    expect(isOccasionAnimated(PLAIN)).toBe(false);
    expect(isOccasionAnimated({ ...PLAIN, particles: [{ ...SNOW, count: 0 }], overlays: [{ style: 'VIGNETTE', color: '#000', opacity: 0.4 }] })).toBe(false);
  });

  it('is true for every kind of motion a look can carry', () => {
    expect(isOccasionAnimated({ ...PLAIN, particles: [SNOW] })).toBe(true);
    expect(isOccasionAnimated({ ...PLAIN, flyers: [SANTA] })).toBe(true);
    expect(isOccasionAnimated({ ...PLAIN, fireworks: { ...PLAIN.fireworks, enabled: true } })).toBe(true);
    expect(isOccasionAnimated({ ...PLAIN, overlays: [{ style: 'FOG', color: '#B9A9D9', opacity: 0.2 }] })).toBe(true);
    expect(isOccasionAnimated({ ...PLAIN, garland: { style: 'STRING_LIGHTS', colors: [] } })).toBe(true);
  });
});

describe('hasOccasionDecoration', () => {
  it('is false when the look draws nothing over the screen', () => {
    expect(hasOccasionDecoration(PLAIN)).toBe(false);
    expect(hasOccasionDecoration({ ...PLAIN, overlays: [{ style: 'NONE', color: '#000', opacity: 1 }] })).toBe(false);
  });

  it('is true for still decoration as well as moving', () => {
    expect(hasOccasionDecoration({ ...PLAIN, flyers: [SANTA] })).toBe(true);
    expect(hasOccasionDecoration({ ...PLAIN, overlays: [{ style: 'VIGNETTE', color: '#000', opacity: 0.5 }] })).toBe(true);
    expect(hasOccasionDecoration({ ...PLAIN, garland: { style: 'BUNTING', colors: [] } })).toBe(true);
  });
});

describe('colorWithAlpha', () => {
  it('turns short and long hex into rgba with the alpha clamped to 0–1', () => {
    expect(colorWithAlpha('#fA0', 0.5)).toBe('rgba(255, 170, 0, 0.5)');
    expect(colorWithAlpha('#1B6B3A', 2)).toBe('rgba(27, 107, 58, 1)');
    expect(colorWithAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
  });

  it('leaves anything it cannot fade exactly as given', () => {
    expect(colorWithAlpha('rgba(1, 2, 3, 0.4)', 0.5)).toBe('rgba(1, 2, 3, 0.4)');
    expect(colorWithAlpha('#abcd', 0.5)).toBe('#abcd');
    expect(colorWithAlpha('#zzzzzz', 0.5)).toBe('#zzzzzz');
  });
});
