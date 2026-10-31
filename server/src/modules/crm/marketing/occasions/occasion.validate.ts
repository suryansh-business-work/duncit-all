import { GraphQLError } from 'graphql';
import { normalizeThemeTokens, type ThemeTokensInput } from '@modules/platform/settings/theme-tokens';
import { slugify } from '@utils/slug';
import type {
  OccasionFireworks,
  OccasionFlyer,
  OccasionGarland,
  OccasionLook,
  OccasionOverlay,
  OccasionParticleLayer,
  OccasionSchedule,
  OccasionVectorLayer,
} from './occasion.types';

/**
 * Reading a look sent by the portal or an MCP agent. Formats the apps cannot
 * paint (a colour that is not hex, path data with anything but path commands,
 * an image that is not https) are refused with the field named, so the sender
 * can fix exactly that. Numbers are kept inside the ranges the schema
 * documents — a look that asks for a thousand snowflakes gets the most the
 * apps draw, not an error.
 */

/** A raw GraphQL input object: every field optional, enums already checked by the schema. */
type Input = Record<string, unknown>;

export const LIMITS = {
  particleLayers: 4,
  flyers: 3,
  overlays: 3,
  colors: 8,
  customPaths: 6,
  customLayers: 40,
  pathLength: 4000,
} as const;

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
// Only SVG path commands, numbers and separators: nothing a renderer could run or fetch.
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,eE+-]+$/;
const HTTPS_URL = /^https:\/\/\S+$/i;

export function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

const list = (value: unknown): Input[] => (Array.isArray(value) ? value.filter((item): item is Input => typeof item === 'object' && item !== null) : []);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.map((item) => String(item ?? '').trim()) : []);
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

/** `value` kept inside [low, high]; the default when it is missing or not a number. */
function clamp(value: unknown, low: number, high: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) ? Math.min(high, Math.max(low, number)) : fallback;
}

function colors(value: unknown, where: string): string[] {
  const out = strings(value).filter(Boolean).slice(0, LIMITS.colors);
  const wrong = out.find((color) => !HEX_COLOR.test(color));
  if (wrong) badInput(`${where}: "${wrong}" is not a hex colour like #FFD54F`);
  return out;
}

/** A colour that may be left blank. */
function optionalColor(value: unknown, where: string): string {
  const color = text(value, 9);
  if (color && !HEX_COLOR.test(color)) badInput(`${where}: "${color}" is not a hex colour like #FFD54F`);
  return color;
}

function pathData(value: unknown, where: string): string {
  const path = String(value ?? '').trim();
  if (!path) return '';
  if (path.length > LIMITS.pathLength) badInput(`${where}: path data is longer than ${LIMITS.pathLength} characters`);
  if (!PATH_DATA.test(path)) badInput(`${where}: path data may only hold SVG path commands and numbers`);
  return path;
}

export function particleLayers(value: unknown): OccasionParticleLayer[] {
  return list(value)
    .slice(0, LIMITS.particleLayers)
    .map((layer, i) => {
      const where = `Particle layer ${i + 1}`;
      const shapes = strings(layer.shapes) as OccasionParticleLayer['shapes'];
      const customPaths = strings(layer.custom_paths)
        .slice(0, LIMITS.customPaths)
        .map((path) => pathData(path, where))
        .filter(Boolean);
      if (shapes.length + customPaths.length === 0) badInput(`${where}: pick at least one shape`);
      const fills = colors(layer.colors, where);
      if (fills.length === 0) badInput(`${where}: give it at least one colour`);
      const sizeMin = clamp(layer.size_min, 2, 96, 6);
      return {
        shapes,
        custom_paths: customPaths,
        colors: fills,
        motion: (layer.motion ?? 'FALL') as OccasionParticleLayer['motion'],
        count: Math.round(clamp(layer.count, 0, 160, 30)),
        size_min: sizeMin,
        size_max: clamp(layer.size_max, sizeMin, 120, Math.max(sizeMin, 14)),
        speed: clamp(layer.speed, 1, 600, 40),
        opacity: clamp(layer.opacity, 0.05, 1, 0.9),
      };
    });
}

function vectorLayers(value: unknown, where: string): OccasionVectorLayer[] {
  return list(value)
    .slice(0, LIMITS.customLayers)
    .map((layer) => ({
      path: pathData(layer.path, where),
      fill: optionalColor(layer.fill, where),
      stroke: optionalColor(layer.stroke, where),
      stroke_width: clamp(layer.stroke_width, 0, 20, 0),
      x: clamp(layer.x, -500, 500, 0),
      y: clamp(layer.y, -500, 500, 0),
    }))
    .filter((layer) => layer.path !== '' && (layer.fill !== '' || (layer.stroke !== '' && layer.stroke_width > 0)));
}

export function flyers(value: unknown): OccasionFlyer[] {
  return list(value)
    .slice(0, LIMITS.flyers)
    .map((flyer, i) => {
      const where = `Flyer ${i + 1}`;
      const artwork = (flyer.artwork ?? 'SHOOTING_STAR') as OccasionFlyer['artwork'];
      const image = text(flyer.image_url, 2000);
      if (image && !HTTPS_URL.test(image)) badInput(`${where}: the image must be an https:// link`);
      if (artwork === 'IMAGE' && !image) badInput(`${where}: upload an image or pick a built-in artwork`);
      const custom = vectorLayers(flyer.custom_layers, where);
      if (artwork === 'CUSTOM' && custom.length === 0) badInput(`${where}: a custom artwork needs at least one layer`);
      const altitudeMin = clamp(flyer.altitude_min, 0, 90, 10);
      const duration = clamp(flyer.duration, 2, 60, 12);
      return {
        artwork,
        custom_layers: custom,
        image_url: image,
        direction: (flyer.direction ?? 'LTR') as OccasionFlyer['direction'],
        altitude_min: altitudeMin,
        altitude_max: clamp(flyer.altitude_max, altitudeMin, 90, Math.max(altitudeMin, 25)),
        size: clamp(flyer.size, 24, 480, 160),
        duration,
        interval: clamp(flyer.interval, duration, 600, Math.max(duration, 30)),
        bob: clamp(flyer.bob, 0, 60, 8),
        trail_color: optionalColor(flyer.trail_color, where),
      };
    });
}

export function fireworks(value: unknown): OccasionFireworks {
  const input = (value ?? {}) as Input;
  const out = {
    enabled: input.enabled === true,
    colors: colors(input.colors, 'Fireworks'),
    bursts_per_minute: clamp(input.bursts_per_minute, 1, 60, 12),
    sparks: Math.round(clamp(input.sparks, 6, 60, 28)),
    radius: clamp(input.radius, 20, 300, 90),
  };
  if (out.enabled && out.colors.length === 0) badInput('Fireworks: give them at least one colour');
  return out;
}

export function overlays(value: unknown): OccasionOverlay[] {
  return list(value)
    .slice(0, LIMITS.overlays)
    .map((item, i) => ({
      style: (item.style ?? 'NONE') as OccasionOverlay['style'],
      color: optionalColor(item.color, `Atmosphere ${i + 1}`) || '#000000',
      opacity: clamp(item.opacity, 0, 1, 0.2),
    }))
    .filter((item) => item.style !== 'NONE');
}

export function garland(value: unknown): OccasionGarland {
  const input = (value ?? {}) as Input;
  return { style: (input.style ?? 'NONE') as OccasionGarland['style'], colors: colors(input.colors, 'Garland') };
}

/**
 * A look as it will be stored: the fields `input` sends over `base` (the
 * stored look, or a blank one), each one checked. Sending only `particles`
 * changes only the particles — an agent asked to "make the snow faster" need
 * not resend the palette.
 */
export function lookFrom(input: Input, base: OccasionLook): OccasionLook {
  const has = (field: string) => input[field] !== undefined && input[field] !== null;
  const name = has('name') ? text(input.name, 60) : base.name;
  if (!name) badInput('Give the look a name');
  return {
    name,
    description: has('description') ? text(input.description, 280) : base.description,
    region: has('region') ? (input.region as OccasionLook['region']) : base.region,
    color_mode: has('color_mode') ? (input.color_mode as OccasionLook['color_mode']) : base.color_mode,
    palette_light: has('palette_light') ? normalizeThemeTokens(input.palette_light as ThemeTokensInput, 'light') : base.palette_light,
    palette_dark: has('palette_dark') ? normalizeThemeTokens(input.palette_dark as ThemeTokensInput, 'dark') : base.palette_dark,
    particles: has('particles') ? particleLayers(input.particles) : base.particles,
    flyers: has('flyers') ? flyers(input.flyers) : base.flyers,
    fireworks: has('fireworks') ? fireworks(input.fireworks) : base.fireworks,
    overlays: has('overlays') ? overlays(input.overlays) : base.overlays,
    garland: has('garland') ? garland(input.garland) : base.garland,
    greeting: has('greeting') ? text(input.greeting, 80) : base.greeting,
  };
}

/** Keys the portal's own routes use (`/occasions/themes/new`), so no look may take them. */
const RESERVED_KEYS = new Set(['new']);

/** A key for a new look: the asked-for one or the name's, made URL-safe. */
export function keyFrom(wanted: unknown, name: string): string {
  const key = slugify(String(wanted ?? '') || name).slice(0, 60);
  if (!key) badInput('Give the look a name with at least one letter or digit');
  return RESERVED_KEYS.has(key) ? `${key}-look` : key;
}

const dateOrNull = (value: unknown, where: string): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) badInput(`${where} is not a date`);
  return date;
};

/** A schedule as stored: both ends to switch it on, the end after the start. */
export function scheduleFrom(input: Input): OccasionSchedule {
  const starts = dateOrNull(input.starts_at, 'The start');
  const ends = dateOrNull(input.ends_at, 'The end');
  const enabled = input.schedule_enabled === true;
  if (enabled && (!starts || !ends)) badInput('Set when the look starts and ends before switching its schedule on');
  if (starts && ends && ends.getTime() <= starts.getTime()) badInput('The look must end after it starts');
  return { starts_at: starts, ends_at: ends, schedule_enabled: enabled, sort_order: Math.round(clamp(input.sort_order, -1000, 1000, 0)) };
}
