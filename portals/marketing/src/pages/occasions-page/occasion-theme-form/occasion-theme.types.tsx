import type {
  OccasionArtwork,
  OccasionColorMode,
  OccasionDirection,
  OccasionGarlandStyle,
  OccasionMotion,
  OccasionRegion,
  OccasionShape,
  OccasionTheme,
} from '@duncit/gql-types';
import type { TokenKey } from '../preview/palette';
import type { OverlayStyle } from './form-copy';

/**
 * A look as the editor holds it. Close to `OccasionThemeInput`, with three
 * conveniences for the controls: a size or altitude range is one `[min, max]`
 * pair (one two-thumb slider), and a layer's custom paths are one text block,
 * a path per line. `occasion-theme.mapping.ts` converts both ways.
 */

/** One mode's 19 colour tokens; '' keeps the app's own value. */
export type PaletteValues = Record<TokenKey, string>;
export type Pair = [number, number];

/** A piece of a custom (agent-made) flyer artwork — carried through unchanged; the editor has no drawing tools. */
export interface VectorLayerValues {
  path: string;
  fill: string;
  stroke: string;
  stroke_width: number;
  x: number;
  y: number;
}

export interface ParticleValues {
  shapes: OccasionShape[];
  /** SVG path data, one path per line. */
  custom_paths: string;
  colors: string[];
  motion: OccasionMotion;
  count: number;
  size: Pair;
  speed: number;
  opacity: number;
}

export interface FlyerValues {
  artwork: OccasionArtwork;
  custom_layers: VectorLayerValues[];
  image_url: string;
  direction: OccasionDirection;
  altitude: Pair;
  size: number;
  duration: number;
  interval: number;
  bob: number;
  trail_color: string;
}

export interface FireworksValues {
  enabled: boolean;
  colors: string[];
  bursts_per_minute: number;
  sparks: number;
  radius: number;
}

export interface OverlayValues {
  style: OverlayStyle;
  color: string;
  opacity: number;
}

export interface GarlandValues {
  style: OccasionGarlandStyle;
  colors: string[];
}

export interface OccasionThemeFormValues {
  name: string;
  description: string;
  region: OccasionRegion;
  color_mode: OccasionColorMode;
  greeting: string;
  palette_light: PaletteValues;
  palette_dark: PaletteValues;
  particles: ParticleValues[];
  flyers: FlyerValues[];
  fireworks: FireworksValues;
  overlays: OverlayValues[];
  garland: GarlandValues;
}

export interface OccasionThemeFormProps {
  /** The look being edited; null designs a new one. */
  theme: OccasionTheme | null;
  /** `apply` = also make it what every app wears now (the page confirms that first). */
  onSubmit: (values: OccasionThemeFormValues, apply: boolean) => Promise<void>;
  /** `dirty` = there are unsaved changes the page should ask about. */
  onCancel: (dirty: boolean) => void;
  /** Why the server refused the last save, shown above the actions. */
  serverError?: string | null;
}
