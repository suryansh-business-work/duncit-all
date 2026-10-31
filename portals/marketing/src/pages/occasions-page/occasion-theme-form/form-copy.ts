import type {
  OccasionArtwork,
  OccasionDirection,
  OccasionGarlandStyle,
  OccasionMotion,
  OccasionOverlayStyle,
  OccasionShape,
} from '@duncit/gql-types';

/**
 * The editor's enums mapped to their Localization keys, written out in full so
 * the translation gate sees each one used. The lists of values come from the
 * shared engine (`OCCASION_SHAPES`, `OCCASION_ARTWORK_NAMES`) where it has one.
 */

export const SHAPE_LABEL: Record<OccasionShape, string> = {
  CIRCLE: 'marketing.occasions.shapes.circle',
  SPARK: 'marketing.occasions.shapes.spark',
  STAR: 'marketing.occasions.shapes.star',
  HEART: 'marketing.occasions.shapes.heart',
  PETAL: 'marketing.occasions.shapes.petal',
  LEAF: 'marketing.occasions.shapes.leaf',
  CONFETTI: 'marketing.occasions.shapes.confetti',
  SNOWFLAKE: 'marketing.occasions.shapes.snowflake',
  DIYA: 'marketing.occasions.shapes.diya',
  FLAME: 'marketing.occasions.shapes.flame',
  KITE: 'marketing.occasions.shapes.kite',
  MOON: 'marketing.occasions.shapes.moon',
  LANTERN: 'marketing.occasions.shapes.lantern',
  BALLOON: 'marketing.occasions.shapes.balloon',
  BAT: 'marketing.occasions.shapes.bat',
  FEATHER: 'marketing.occasions.shapes.feather',
  DROP: 'marketing.occasions.shapes.drop',
  RING: 'marketing.occasions.shapes.ring',
  MODAK: 'marketing.occasions.shapes.modak',
  EGG: 'marketing.occasions.shapes.egg',
  CHAKRA: 'marketing.occasions.shapes.chakra',
  SUN: 'marketing.occasions.shapes.sun',
  PUMPKIN: 'marketing.occasions.shapes.pumpkin',
  GHOST: 'marketing.occasions.shapes.ghost',
  GIFT: 'marketing.occasions.shapes.gift',
  BELL: 'marketing.occasions.shapes.bell',
  CANDY_CANE: 'marketing.occasions.shapes.candyCane',
  TREE: 'marketing.occasions.shapes.tree',
  ORNAMENT: 'marketing.occasions.shapes.ornament',
  MARIGOLD: 'marketing.occasions.shapes.marigold',
};

export const ARTWORK_LABEL: Record<OccasionArtwork, string> = {
  SANTA_SLEIGH: 'marketing.occasions.artworks.santaSleigh',
  WITCH_BROOM: 'marketing.occasions.artworks.witchBroom',
  KITE: 'marketing.occasions.artworks.kite',
  HOT_AIR_BALLOON: 'marketing.occasions.artworks.hotAirBalloon',
  SHOOTING_STAR: 'marketing.occasions.artworks.shootingStar',
  CUSTOM: 'marketing.occasions.artworks.custom',
  IMAGE: 'marketing.occasions.artworks.image',
};

export const MOTIONS = ['FALL', 'RISE', 'DRIFT', 'TWINKLE'] as const satisfies readonly OccasionMotion[];

export const MOTION_LABEL: Record<OccasionMotion, string> = {
  FALL: 'marketing.occasions.motions.fall',
  RISE: 'marketing.occasions.motions.rise',
  DRIFT: 'marketing.occasions.motions.drift',
  TWINKLE: 'marketing.occasions.motions.twinkle',
};

export const DIRECTIONS = ['LTR', 'RTL'] as const satisfies readonly OccasionDirection[];

export const DIRECTION_LABEL: Record<OccasionDirection, string> = {
  LTR: 'marketing.occasions.directions.ltr',
  RTL: 'marketing.occasions.directions.rtl',
};

/** The washes a look can add; NONE is not offered — removing the layer is how to have none. */
export const OVERLAY_STYLES = ['GLOW_TOP', 'VIGNETTE', 'FOG'] as const satisfies readonly OccasionOverlayStyle[];

export type OverlayStyle = (typeof OVERLAY_STYLES)[number];

export const OVERLAY_LABEL: Record<OverlayStyle, string> = {
  GLOW_TOP: 'marketing.occasions.overlays.glowTop',
  VIGNETTE: 'marketing.occasions.overlays.vignette',
  FOG: 'marketing.occasions.overlays.fog',
};

export const GARLAND_STYLES = ['NONE', 'STRING_LIGHTS', 'BUNTING', 'MARIGOLD', 'SPIDER_WEB', 'ICICLES'] as const satisfies readonly OccasionGarlandStyle[];

export const GARLAND_LABEL: Record<OccasionGarlandStyle, string> = {
  NONE: 'marketing.occasions.garlands.none',
  STRING_LIGHTS: 'marketing.occasions.garlands.stringLights',
  BUNTING: 'marketing.occasions.garlands.bunting',
  MARIGOLD: 'marketing.occasions.garlands.marigold',
  SPIDER_WEB: 'marketing.occasions.garlands.spiderWeb',
  ICICLES: 'marketing.occasions.garlands.icicles',
};
