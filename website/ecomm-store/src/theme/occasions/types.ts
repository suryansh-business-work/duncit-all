import type { StoreOccasionTheme } from '../../graphql/settings';
import type { StorePalette } from '../tokens';

/** The small vector marks an occasion's animation draws (SVG paths, never text glyphs). */
export type ParticleShape =
  | 'circle'
  | 'spark'
  | 'star'
  | 'heart'
  | 'petal'
  | 'leaf'
  | 'confetti'
  | 'snowflake'
  | 'diya'
  | 'flame'
  | 'kite'
  | 'moon'
  | 'lantern'
  | 'balloon'
  | 'bat'
  | 'feather'
  | 'drop'
  | 'ring'
  | 'modak'
  | 'egg'
  | 'chakra'
  | 'sun';

/** How the marks move: fall from the top, rise from the bottom, drift sideways, or stay and twinkle. */
export type ParticleMotion = 'fall' | 'rise' | 'drift' | 'twinkle';

/** An occasion's light animation, drawn on one canvas behind nothing interactive. */
export interface OccasionEffect {
  shapes: readonly ParticleShape[];
  /** Fill colours, picked per particle. Decorative only; nothing reads text on them. */
  colors: readonly string[];
  motion: ParticleMotion;
  /** How many marks on a 1440px-wide desktop; phones get proportionally fewer. */
  count: number;
  /** Mark size range in CSS px. */
  size: readonly [number, number];
  /** Pixels per second at size 1; each mark varies around it. */
  speed: number;
}

/**
 * One festive look: the palette overrides per mode (each still meets the
 * contrast rules in `../tokens`) and its animation. Keys absent from a mode
 * keep the house value.
 */
export interface OccasionLook {
  light: Partial<StorePalette>;
  dark: Partial<StorePalette>;
  effect: OccasionEffect;
}

export type FestiveTheme = Exclude<StoreOccasionTheme, 'NONE'>;
