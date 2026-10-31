import { applyTokenOverrides, type ThemePalettes, type ThemeTokenOverrides } from './theme-tokens';

/**
 * Occasion looks: the festive skins Marketing → Occasions lays over the Duncit
 * apps (mWeb and native). A look is data — the server's `OccasionTheme` — made
 * of colour-token overrides plus decoration: marks that fall, rise, drift or
 * twinkle, artwork that flies across the screen, fireworks, a garland along the
 * top edge and an atmosphere overlay. A new festival is a new record (made in
 * the portal or by an MCP agent), never a release.
 *
 * These are the client-side types every surface reads. The GraphQL schema in
 * `server/src/modules/crm/marketing/occasions` is their source of truth; a name
 * this build does not know (a newer server) is skipped, never thrown on.
 */

export type OccasionColorMode = 'AUTO' | 'LIGHT' | 'DARK';
export type OccasionMotion = 'FALL' | 'RISE' | 'DRIFT' | 'TWINKLE';
export type OccasionDirection = 'LTR' | 'RTL';
export type OccasionOverlayStyle = 'NONE' | 'VIGNETTE' | 'GLOW_TOP' | 'FOG';
export type OccasionGarlandStyle = 'NONE' | 'STRING_LIGHTS' | 'BUNTING' | 'MARIGOLD' | 'SPIDER_WEB' | 'ICICLES';

/** A swarm of small marks — snow, sparks, petals, bats, confetti. */
export interface OccasionParticleLayer {
  /** Built-in shape names (`OCCASION_SHAPES`). */
  shapes: readonly string[];
  /** Extra marks as SVG path data in a 24×24 box centred on (12, 12). */
  custom_paths: readonly string[];
  /** Hex fills, one picked per mark. */
  colors: readonly string[];
  motion: OccasionMotion;
  /** Marks on a 1440px-wide screen; a phone gets proportionally fewer. */
  count: number;
  /** Mark size range in CSS px. */
  size_min: number;
  size_max: number;
  /** Pixels per second along the motion; for TWINKLE, how fast the pulse is. */
  speed: number;
  /** 0–1. */
  opacity: number;
}

/** One piece of a vector artwork: path data, its paint and an offset inside the artwork's box. */
export interface OccasionVectorLayer {
  path: string;
  /** Hex fill; '' paints none. */
  fill: string;
  /** Hex outline; '' paints none. */
  stroke: string;
  stroke_width: number;
  x: number;
  y: number;
}

/** Artwork that crosses the screen now and then — Santa's sleigh, a witch, a kite. */
export interface OccasionFlyer {
  /** A built-in artwork name, `CUSTOM` (draws `custom_layers`) or `IMAGE` (draws `image_url`). */
  artwork: string;
  /** Drawn facing right in a 240×120 box. */
  custom_layers: readonly OccasionVectorLayer[];
  image_url: string;
  direction: OccasionDirection;
  /** The band it crosses in, as % of the screen height from the top. */
  altitude_min: number;
  altitude_max: number;
  /** Width in px. */
  size: number;
  /** Seconds to cross the screen. */
  duration: number;
  /** Seconds from one pass's start to the next (never shorter than `duration`). */
  interval: number;
  /** Pixels of gentle up-and-down while it flies. */
  bob: number;
  /** Hex colour of the sparkle dust behind it; '' leaves no trail. */
  trail_color: string;
}

export interface OccasionFireworks {
  enabled: boolean;
  colors: readonly string[];
  bursts_per_minute: number;
  /** Sparks in one burst. */
  sparks: number;
  /** How far a burst spreads, in px. */
  radius: number;
}

export interface OccasionOverlay {
  style: OccasionOverlayStyle;
  color: string;
  /** 0–1 at its strongest point. */
  opacity: number;
}

export interface OccasionGarland {
  style: OccasionGarlandStyle;
  /** Bulb / flag / flower colours, cycled along the string; empty uses the style's own. */
  colors: readonly string[];
}

/** One mode's colour-token overrides, keyed like the app palette; blank keeps the app's value. */
export type OccasionPalette = Readonly<Record<string, string | null | undefined>>;

/** Everything a surface needs to wear a look. */
export interface OccasionDesign {
  key: string;
  name: string;
  color_mode: OccasionColorMode;
  palette_light: OccasionPalette;
  palette_dark: OccasionPalette;
  particles: readonly OccasionParticleLayer[];
  flyers: readonly OccasionFlyer[];
  fireworks: OccasionFireworks;
  overlays: readonly OccasionOverlay[];
  garland: OccasionGarland;
  /** A short festive line the apps show once a session; '' shows none. */
  greeting: string;
}

/** The decoration half of a look — what the effect renderers read. */
export type OccasionDecoration = Pick<OccasionDesign, 'particles' | 'flyers' | 'fireworks' | 'overlays' | 'garland'>;

/** The mode a surface paints in: the look's own when it pins one (Halloween is a night), else the viewer's. */
export function occasionColorMode<M extends 'light' | 'dark'>(
  viewerMode: M,
  design?: Pick<OccasionDesign, 'color_mode'> | null,
): 'light' | 'dark' {
  if (design?.color_mode === 'LIGHT') return 'light';
  if (design?.color_mode === 'DARK') return 'dark';
  return viewerMode;
}

/**
 * The palettes with the look's overrides written over them. Without a look it
 * hands back the same reference, so a memoised theme is not rebuilt for the
 * house look.
 */
export function occasionPalettes<T extends Record<keyof T, string>>(
  palettes: ThemePalettes<T>,
  design?: Pick<OccasionDesign, 'palette_light' | 'palette_dark'> | null,
): ThemePalettes<T> {
  if (!design) return palettes;
  const light: ThemeTokenOverrides<T> = design.palette_light;
  const dark: ThemeTokenOverrides<T> = design.palette_dark;
  return { light: applyTokenOverrides(palettes.light, light), dark: applyTokenOverrides(palettes.dark, dark) };
}

/** Whether anything in the look moves — what decides if a pause control is owed (WCAG 2.2.2). */
export function isOccasionAnimated(decoration: OccasionDecoration): boolean {
  return (
    decoration.particles.some((layer) => layer.count > 0) ||
    decoration.flyers.length > 0 ||
    decoration.fireworks.enabled ||
    decoration.overlays.some((overlay) => overlay.style === 'FOG') ||
    decoration.garland.style === 'STRING_LIGHTS'
  );
}

/** Whether the look draws anything at all over the screen, moving or not. */
export function hasOccasionDecoration(decoration: OccasionDecoration): boolean {
  return (
    isOccasionAnimated(decoration) ||
    decoration.overlays.some((overlay) => overlay.style !== 'NONE') ||
    decoration.garland.style !== 'NONE'
  );
}

/**
 * `#rgb` / `#rrggbb` as `rgba(r, g, b, alpha)` — what a canvas gradient stop
 * needs to fade a colour out. Anything else comes back unchanged (it already
 * carries its own alpha, or the renderer cannot fade it). The server only
 * stores hex for decoration colours, so this never has to parse more.
 */
export function colorWithAlpha(color: string, alpha: number): string {
  const hex = color.startsWith('#') ? color.slice(1) : '';
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const channels = full.length === 6 ? [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16)) : [];
  if (channels.length === 0 || channels.some(Number.isNaN)) return color;
  return `rgba(${channels.join(', ')}, ${Math.min(1, Math.max(0, alpha))})`;
}
