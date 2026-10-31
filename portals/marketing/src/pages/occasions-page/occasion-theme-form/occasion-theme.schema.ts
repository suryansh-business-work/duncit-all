import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { isHexColor, isSvgPathData } from '@duncit/regex';
import { OCCASION_ARTWORK_NAMES, OCCASION_SHAPES } from '@duncit/utils';
import { COLOR_MODES, REGIONS } from '../copy';
import { TOKEN_KEYS, type TokenKey } from '../preview/palette';
import { DIRECTIONS, GARLAND_STYLES, MOTIONS, OVERLAY_STYLES } from './form-copy';
import { LIMITS, RANGES, type Range } from './occasion-theme.limits';

/** Every artwork a flyer can be: the built-ins, an agent-made CUSTOM one, or an uploaded IMAGE. */
export const ARTWORKS = [...OCCASION_ARTWORK_NAMES, 'CUSTOM', 'IMAGE'] as const;

/** A layer's custom paths, one per line, blank lines dropped. */
export const pathLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const HTTPS = 'https://';

/** At most `LIMITS.customPaths` lines, each only path commands and numbers. */
const checkPaths = (t: Translate, tooManyMessage: string) => (text: string, ctx: z.RefinementCtx) => {
  const lines = pathLines(text);
  if (lines.length > LIMITS.customPaths) ctx.addIssue({ code: 'custom', message: tooManyMessage });
  else if (lines.some((line) => line.length > LIMITS.pathLength || !isSvgPathData(line))) {
    ctx.addIssue({ code: 'custom', message: t('marketing.occasions.form.pathInvalid', { vars: { max: LIMITS.pathLength } }) });
  }
};

/** A particle layer draws something: a built-in shape or a path of its own. */
const needsShape = (t: Translate) => (layer: { shapes: readonly string[]; custom_paths: string }, ctx: z.RefinementCtx) => {
  if (layer.shapes.length + pathLines(layer.custom_paths).length === 0) {
    ctx.addIssue({ code: 'custom', path: ['shapes'], message: t('marketing.occasions.form.shapeRequired') });
  }
};

type FlyerCheck = { artwork: string; image_url: string; interval: number; duration: number };

/** An IMAGE flyer has an https image, and no flyer comes round again before it has crossed. */
const checkFlyer = (t: Translate) => (value: FlyerCheck, ctx: z.RefinementCtx) => {
  if (value.artwork === 'IMAGE' && !value.image_url.toLowerCase().startsWith(HTTPS)) {
    ctx.addIssue({ code: 'custom', path: ['image_url'], message: t('marketing.occasions.form.imageRequired') });
  }
  if (value.interval < value.duration) {
    ctx.addIssue({ code: 'custom', path: ['interval'], message: t('marketing.occasions.form.intervalTooShort') });
  }
};

/** Fireworks that are on need a colour to burst in. */
const needsFireworkColor = (t: Translate) => (value: { enabled: boolean; colors: readonly string[] }, ctx: z.RefinementCtx) => {
  if (value.enabled && value.colors.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['colors'], message: t('marketing.occasions.form.colorRequired') });
  }
};

/** Blank (the app's own), hex, or a non-hex value the server already stores. */
const isTokenColor = (kept: ReadonlySet<string>) => (value: string) => value === '' || isHexColor(value) || kept.has(value);

const isOptionalHex = (value: string) => value === '' || isHexColor(value);

/**
 * The server's own checks, said before the save: hex colours, path data that
 * is only path commands and numbers, an https image, at least one shape and
 * one colour per layer, and a flyer that does not come round before it has
 * crossed. `kept` holds the non-hex palette values the server already stores
 * (Halloween's translucent border) — left as they are, they still save.
 */
export function occasionThemeSchema(t: Translate, kept: ReadonlySet<string>) {
  const inRange = (range: Range) => {
    const message = t('marketing.occasions.form.numberRange', { vars: { min: range.min, max: range.max } });
    return z.number().min(range.min, message).max(range.max, message);
  };
  const whole = (range: Range) => inRange(range).int(t('marketing.occasions.form.wholeNumber'));
  const pair = (range: Range) => z.tuple([inRange(range), inRange(range)]);
  const tooMany = (max: number) => t('marketing.occasions.form.tooMany', { vars: { max } });
  const tooLong = (max: number) => t('marketing.occasions.form.tooLong', { vars: { max } });
  const hexMessage = t('marketing.occasions.form.hexColor');
  const hex = z.string().trim().refine(isHexColor, hexMessage);
  const optionalHex = z.string().trim().refine(isOptionalHex, hexMessage);
  const colors = z.array(hex).max(LIMITS.colors, tooMany(LIMITS.colors));
  const tokenColor = z.string().trim().refine(isTokenColor(kept), t('marketing.occasions.form.paletteColor'));
  const palette = z.object(Object.fromEntries(TOKEN_KEYS.map((key) => [key, tokenColor])) as Record<TokenKey, typeof tokenColor>);

  const particle = z
    .object({
      shapes: z.array(z.enum(OCCASION_SHAPES)),
      custom_paths: z.string().superRefine(checkPaths(t, tooMany(LIMITS.customPaths))),
      colors: colors.min(1, t('marketing.occasions.form.colorRequired')),
      motion: z.enum(MOTIONS),
      count: whole(RANGES.count),
      size: pair(RANGES.size),
      speed: inRange(RANGES.speed),
      opacity: inRange(RANGES.opacity),
    })
    .superRefine(needsShape(t));

  const vectorLayer = z.object({ path: z.string(), fill: z.string(), stroke: z.string(), stroke_width: z.number(), x: z.number(), y: z.number() });

  const flyer = z
    .object({
      artwork: z.enum(ARTWORKS),
      custom_layers: z.array(vectorLayer),
      image_url: z.string().trim().max(LIMITS.imageUrl, tooLong(LIMITS.imageUrl)),
      direction: z.enum(DIRECTIONS),
      altitude: pair(RANGES.altitude),
      size: inRange(RANGES.flyerSize),
      duration: inRange(RANGES.duration),
      interval: inRange(RANGES.interval),
      bob: inRange(RANGES.bob),
      trail_color: optionalHex,
    })
    .superRefine(checkFlyer(t));

  const fireworks = z
    .object({
      enabled: z.boolean(),
      colors,
      bursts_per_minute: inRange(RANGES.bursts),
      sparks: whole(RANGES.sparks),
      radius: inRange(RANGES.radius),
    })
    .superRefine(needsFireworkColor(t));

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('marketing.occasions.form.nameRequired'))
      .max(LIMITS.name, t('marketing.occasions.form.nameTooLong', { vars: { max: LIMITS.name } })),
    description: z.string().trim().max(LIMITS.description, tooLong(LIMITS.description)),
    region: z.enum(REGIONS),
    color_mode: z.enum(COLOR_MODES),
    greeting: z.string().trim().max(LIMITS.greeting, tooLong(LIMITS.greeting)),
    palette_light: palette,
    palette_dark: palette,
    particles: z.array(particle).max(LIMITS.particleLayers, tooMany(LIMITS.particleLayers)),
    flyers: z.array(flyer).max(LIMITS.flyers, tooMany(LIMITS.flyers)),
    fireworks,
    overlays: z
      .array(z.object({ style: z.enum(OVERLAY_STYLES), color: optionalHex, opacity: inRange(RANGES.overlayOpacity) }))
      .max(LIMITS.overlays, tooMany(LIMITS.overlays)),
    garland: z.object({ style: z.enum(GARLAND_STYLES), colors }),
  });
}
