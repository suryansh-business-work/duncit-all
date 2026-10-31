import { themeTokensToPub } from '@modules/platform/settings/theme-tokens';
import { OCCASION_PALETTES } from './occasion.palettes';
import type {
  OccasionArtwork,
  OccasionFireworks,
  OccasionFlyer,
  OccasionGarland,
  OccasionGarlandStyle,
  OccasionLook,
  OccasionMotion,
  OccasionOverlay,
  OccasionOverlayStyle,
  OccasionParticleLayer,
  OccasionShape,
} from './occasion.types';

/**
 * Small builders the built-in catalogue is written with, so each festival
 * reads as a design ("gold sparks twinkling, diyas rising, a marigold toran")
 * rather than forty lines of defaults.
 */

export const swarm = (
  shapes: OccasionShape[],
  motion: OccasionMotion,
  colors: string[],
  over: Partial<Omit<OccasionParticleLayer, 'shapes' | 'motion' | 'colors'>> = {}
): OccasionParticleLayer => ({
  shapes,
  custom_paths: [],
  colors,
  motion,
  count: 30,
  size_min: 6,
  size_max: 14,
  speed: 40,
  opacity: 0.9,
  ...over,
});

export const flyer = (artwork: OccasionArtwork, over: Partial<Omit<OccasionFlyer, 'artwork'>> = {}): OccasionFlyer => ({
  artwork,
  custom_layers: [],
  image_url: '',
  direction: 'LTR',
  altitude_min: 8,
  altitude_max: 22,
  size: 160,
  duration: 12,
  interval: 30,
  bob: 8,
  trail_color: '',
  ...over,
});

export const NO_FIREWORKS: OccasionFireworks = { enabled: false, colors: [], bursts_per_minute: 12, sparks: 28, radius: 90 };

export const fireworks = (colors: string[], over: Partial<Omit<OccasionFireworks, 'enabled' | 'colors'>> = {}): OccasionFireworks => ({
  ...NO_FIREWORKS,
  enabled: true,
  colors,
  ...over,
});

export const overlay = (style: OccasionOverlayStyle, color: string, opacity: number): OccasionOverlay => ({ style, color, opacity });

export const garland = (style: OccasionGarlandStyle, colors: string[] = []): OccasionGarland => ({ style, colors });

/** What a catalogue entry spells out; everything else has a sensible default. */
export type BuiltinSpec = Pick<OccasionLook, 'name' | 'description' | 'region' | 'greeting' | 'particles'> &
  Partial<Pick<OccasionLook, 'color_mode' | 'flyers' | 'fireworks' | 'overlays' | 'garland'>>;

/** A built-in look: its own spec over the defaults, wearing the colour tokens made for its key. */
export function builtin(key: string, spec: BuiltinSpec): OccasionLook & { key: string } {
  const palette = OCCASION_PALETTES[key];
  return {
    key,
    color_mode: 'AUTO',
    flyers: [],
    fireworks: NO_FIREWORKS,
    overlays: [],
    garland: garland('NONE'),
    ...spec,
    palette_light: themeTokensToPub(palette?.light),
    palette_dark: themeTokensToPub(palette?.dark),
  };
}
