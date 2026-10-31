import type { ThemeTokens } from '@modules/platform/settings/theme-tokens';

/**
 * Occasion looks — the festive skins Marketing → Occasions puts on the Duncit
 * apps. Every list here is a GraphQL enum too; the apps' renderer
 * (@duncit/utils `occasion-*`, which the server cannot import) keeps the
 * drawing for each name. A shape or artwork added here needs its drawing
 * there, or the apps skip it.
 */

export const OCCASION_SHAPES = [
  'CIRCLE',
  'SPARK',
  'STAR',
  'HEART',
  'PETAL',
  'LEAF',
  'CONFETTI',
  'SNOWFLAKE',
  'DIYA',
  'FLAME',
  'KITE',
  'MOON',
  'LANTERN',
  'BALLOON',
  'BAT',
  'FEATHER',
  'DROP',
  'RING',
  'MODAK',
  'EGG',
  'CHAKRA',
  'SUN',
  'PUMPKIN',
  'GHOST',
  'GIFT',
  'BELL',
  'CANDY_CANE',
  'TREE',
  'ORNAMENT',
  'MARIGOLD',
] as const;
export const OCCASION_MOTIONS = ['FALL', 'RISE', 'DRIFT', 'TWINKLE'] as const;
export const OCCASION_ARTWORKS = ['SANTA_SLEIGH', 'WITCH_BROOM', 'KITE', 'HOT_AIR_BALLOON', 'SHOOTING_STAR', 'CUSTOM', 'IMAGE'] as const;
export const OCCASION_DIRECTIONS = ['LTR', 'RTL'] as const;
export const OCCASION_OVERLAY_STYLES = ['NONE', 'VIGNETTE', 'GLOW_TOP', 'FOG'] as const;
export const OCCASION_GARLAND_STYLES = ['NONE', 'STRING_LIGHTS', 'BUNTING', 'MARIGOLD', 'SPIDER_WEB', 'ICICLES'] as const;
export const OCCASION_COLOR_MODES = ['AUTO', 'LIGHT', 'DARK'] as const;
export const OCCASION_REGIONS = ['INDIAN', 'NATIONAL', 'WESTERN', 'GLOBAL', 'CUSTOM'] as const;
/** NORMAL = the house look; MANUAL = one look pinned; SCHEDULE = whichever window is open. */
export const OCCASION_LIVE_MODES = ['NORMAL', 'MANUAL', 'SCHEDULE'] as const;

export type OccasionShape = (typeof OCCASION_SHAPES)[number];
export type OccasionMotion = (typeof OCCASION_MOTIONS)[number];
export type OccasionArtwork = (typeof OCCASION_ARTWORKS)[number];
export type OccasionDirection = (typeof OCCASION_DIRECTIONS)[number];
export type OccasionOverlayStyle = (typeof OCCASION_OVERLAY_STYLES)[number];
export type OccasionGarlandStyle = (typeof OCCASION_GARLAND_STYLES)[number];
export type OccasionColorMode = (typeof OCCASION_COLOR_MODES)[number];
export type OccasionRegion = (typeof OCCASION_REGIONS)[number];
export type OccasionLiveMode = (typeof OCCASION_LIVE_MODES)[number];

export interface OccasionParticleLayer {
  shapes: OccasionShape[];
  custom_paths: string[];
  colors: string[];
  motion: OccasionMotion;
  count: number;
  size_min: number;
  size_max: number;
  speed: number;
  opacity: number;
}

export interface OccasionVectorLayer {
  path: string;
  fill: string;
  stroke: string;
  stroke_width: number;
  x: number;
  y: number;
}

export interface OccasionFlyer {
  artwork: OccasionArtwork;
  custom_layers: OccasionVectorLayer[];
  image_url: string;
  direction: OccasionDirection;
  altitude_min: number;
  altitude_max: number;
  size: number;
  duration: number;
  interval: number;
  bob: number;
  trail_color: string;
}

export interface OccasionFireworks {
  enabled: boolean;
  colors: string[];
  bursts_per_minute: number;
  sparks: number;
  radius: number;
}

export interface OccasionOverlay {
  style: OccasionOverlayStyle;
  color: string;
  opacity: number;
}

export interface OccasionGarland {
  style: OccasionGarlandStyle;
  colors: string[];
}

/** Everything that makes a look — what the portal edits, an MCP agent designs and a built-in ships. */
export interface OccasionLook {
  name: string;
  description: string;
  region: OccasionRegion;
  color_mode: OccasionColorMode;
  palette_light: ThemeTokens;
  palette_dark: ThemeTokens;
  particles: OccasionParticleLayer[];
  flyers: OccasionFlyer[];
  fireworks: OccasionFireworks;
  overlays: OccasionOverlay[];
  garland: OccasionGarland;
  greeting: string;
}

/** When a look goes live by itself — optional; the live mode decides whether dates count at all. */
export interface OccasionSchedule {
  starts_at: Date | null;
  ends_at: Date | null;
  schedule_enabled: boolean;
  /** Higher wins when two windows overlap, so a short campaign can sit over a season. */
  sort_order: number;
}

/** A stored look: its design, its schedule and its bookkeeping. */
export interface OccasionThemeDoc extends OccasionLook, OccasionSchedule {
  key: string;
  is_builtin: boolean;
  is_archived: boolean;
  created_at?: Date;
  updated_at?: Date;
}
