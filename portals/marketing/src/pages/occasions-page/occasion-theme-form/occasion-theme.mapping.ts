import type {
  OccasionFireworks,
  OccasionFlyer,
  OccasionOverlay,
  OccasionParticleLayer,
  OccasionTheme,
  OccasionThemeInput,
  OccasionVectorLayer,
  ThemeModeTokens,
} from '@duncit/gql-types';
import { isHexColor, isSvgPathData } from '@duncit/regex';
import { tokens } from '@duncit/theme';
import type { OccasionDesign } from '@duncit/utils';
import { TOKEN_KEYS } from '../preview/palette';
import type { OverlayStyle } from './form-copy';
import { LAYER_DEFAULTS } from './occasion-theme.limits';
import { pathLines } from './occasion-theme.schema';
import type {
  FireworksValues,
  FlyerValues,
  OccasionThemeFormValues,
  PaletteValues,
  ParticleValues,
  VectorLayerValues,
} from './occasion-theme.types';

/** The look's tokens as the 19 form fields (no `__typename`), blank where it keeps the app's own. */
const paletteValues = (stored?: ThemeModeTokens | null): PaletteValues =>
  Object.fromEntries(TOKEN_KEYS.map((key) => [key, stored?.[key] ?? ''])) as PaletteValues;

const trimmedPalette = (palette: PaletteValues): PaletteValues =>
  Object.fromEntries(TOKEN_KEYS.map((key) => [key, palette[key].trim()])) as PaletteValues;

const vectorValues = ({ path, fill, stroke, stroke_width, x, y }: OccasionVectorLayer): VectorLayerValues => ({ path, fill, stroke, stroke_width, x, y });

const particleValues = (layer: OccasionParticleLayer): ParticleValues => ({
  shapes: [...layer.shapes],
  custom_paths: layer.custom_paths.join('\n'),
  colors: [...layer.colors],
  motion: layer.motion,
  count: layer.count,
  size: [layer.size_min, layer.size_max],
  speed: layer.speed,
  opacity: layer.opacity,
});

const flyerValues = (flyer: OccasionFlyer): FlyerValues => ({
  artwork: flyer.artwork,
  custom_layers: flyer.custom_layers.map(vectorValues),
  image_url: flyer.image_url,
  direction: flyer.direction,
  altitude: [flyer.altitude_min, flyer.altitude_max],
  size: flyer.size,
  duration: flyer.duration,
  interval: flyer.interval,
  bob: flyer.bob,
  trail_color: flyer.trail_color,
});

const fireworksValues = ({ enabled, colors, bursts_per_minute, sparks, radius }: OccasionFireworks): FireworksValues => ({
  enabled,
  colors: [...colors],
  bursts_per_minute,
  sparks,
  radius,
});

/** The server drops NONE washes on save, so the editor never holds one. */
const isShownOverlay = (overlay: OccasionOverlay): overlay is OccasionOverlay & { style: OverlayStyle } => overlay.style !== 'NONE';

/** A look as the form edits it; null is a new look — the house look with nothing over it. */
export function themeValues(theme: OccasionTheme | null): OccasionThemeFormValues {
  return {
    name: theme?.name ?? '',
    description: theme?.description ?? '',
    region: theme?.region ?? 'CUSTOM',
    color_mode: theme?.color_mode ?? 'AUTO',
    greeting: theme?.greeting ?? '',
    palette_light: paletteValues(theme?.palette_light),
    palette_dark: paletteValues(theme?.palette_dark),
    particles: (theme?.particles ?? []).map(particleValues),
    flyers: (theme?.flyers ?? []).map(flyerValues),
    fireworks: theme ? fireworksValues(theme.fireworks) : { enabled: false, colors: [], ...LAYER_DEFAULTS.fireworks },
    overlays: (theme?.overlays ?? []).filter(isShownOverlay).map(({ style, color, opacity }) => ({ style, color, opacity })),
    garland: { style: theme?.garland.style ?? 'NONE', colors: [...(theme?.garland.colors ?? [])] },
  };
}

/**
 * Non-hex palette values the server already stores (Halloween's translucent
 * border). The editor only writes hex, but these may stay as they are.
 */
export function keptPaletteValues(theme: OccasionTheme | null): ReadonlySet<string> {
  const stored = theme ? [theme.palette_light, theme.palette_dark].flatMap((palette) => TOKEN_KEYS.map((key) => palette[key])) : [];
  return new Set(stored.filter((value) => value !== '' && !isHexColor(value)));
}

const low = ([a, b]: [number, number]) => Math.min(a, b);
const high = ([a, b]: [number, number]) => Math.max(a, b);
const trimAll = (list: readonly string[]) => list.map((item) => item.trim());

/** The whole look as `OccasionThemeInput` — a full save, every field sent. */
export function toThemeInput(values: OccasionThemeFormValues): OccasionThemeInput {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    region: values.region,
    color_mode: values.color_mode,
    greeting: values.greeting.trim(),
    palette_light: trimmedPalette(values.palette_light),
    palette_dark: trimmedPalette(values.palette_dark),
    particles: values.particles.map((layer) => ({
      shapes: layer.shapes,
      custom_paths: pathLines(layer.custom_paths),
      colors: trimAll(layer.colors),
      motion: layer.motion,
      count: Math.round(layer.count),
      size_min: low(layer.size),
      size_max: high(layer.size),
      speed: layer.speed,
      opacity: layer.opacity,
    })),
    flyers: values.flyers.map((flyer) => ({
      artwork: flyer.artwork,
      custom_layers: flyer.custom_layers,
      // The server refuses any image that is not https, so one left behind by a switch of artwork is not sent.
      image_url: flyer.artwork === 'IMAGE' ? flyer.image_url.trim() : '',
      direction: flyer.direction,
      altitude_min: low(flyer.altitude),
      altitude_max: high(flyer.altitude),
      size: flyer.size,
      duration: flyer.duration,
      interval: Math.max(flyer.interval, flyer.duration),
      bob: flyer.bob,
      trail_color: flyer.trail_color.trim(),
    })),
    fireworks: {
      enabled: values.fireworks.enabled,
      colors: trimAll(values.fireworks.colors),
      bursts_per_minute: values.fireworks.bursts_per_minute,
      sparks: Math.round(values.fireworks.sparks),
      radius: values.fireworks.radius,
    },
    overlays: values.overlays.map(({ style, color, opacity }) => ({ style, color: color.trim(), opacity })),
    garland: { style: values.garland.style, colors: trimAll(values.garland.colors) },
  };
}

/** A colour the preview can paint: hex, or any CSS colour the browser reads (a stored rgba token). */
const paintable = (value: string): boolean => isHexColor(value) || (typeof CSS !== 'undefined' && CSS.supports('color', value));

const hexOnly = (list: readonly string[]) => trimAll(list).filter(isHexColor);
const hexOrBlank = (value: string) => (isHexColor(value.trim()) ? value.trim() : '');

const previewPalette = (palette: PaletteValues) =>
  Object.fromEntries(TOKEN_KEYS.map((key) => [key, paintable(palette[key].trim()) ? palette[key].trim() : '']));

const previewFlyer = (flyer: FlyerValues) => {
  const image = flyer.image_url.trim();
  return {
    artwork: flyer.artwork,
    custom_layers: flyer.custom_layers,
    image_url: flyer.artwork === 'IMAGE' && image.toLowerCase().startsWith('https://') ? image : '',
    direction: flyer.direction,
    altitude_min: low(flyer.altitude),
    altitude_max: high(flyer.altitude),
    size: flyer.size,
    duration: flyer.duration,
    interval: Math.max(flyer.interval, flyer.duration),
    bob: flyer.bob,
    trail_color: hexOrBlank(flyer.trail_color),
  };
};

/** What the preview draws from — description and region change nothing on screen. */
export type PreviewSource = Omit<OccasionThemeFormValues, 'description' | 'region'>;

/**
 * The form as the renderer reads a look, for the live preview. A half-typed
 * colour or path is left out rather than handed to the canvas, so the preview
 * keeps running while the marketer types.
 */
export function toPreviewDesign(values: PreviewSource, fallbackName: string): OccasionDesign {
  return {
    key: 'preview',
    name: values.name.trim() || fallbackName,
    color_mode: values.color_mode,
    greeting: values.greeting.trim(),
    palette_light: previewPalette(values.palette_light),
    palette_dark: previewPalette(values.palette_dark),
    particles: values.particles.map((layer) => ({
      shapes: layer.shapes,
      custom_paths: pathLines(layer.custom_paths).filter(isSvgPathData),
      colors: hexOnly(layer.colors),
      motion: layer.motion,
      count: layer.count,
      size_min: low(layer.size),
      size_max: high(layer.size),
      speed: layer.speed,
      opacity: layer.opacity,
    })),
    flyers: values.flyers.map(previewFlyer),
    fireworks: { ...values.fireworks, colors: hexOnly(values.fireworks.colors) },
    overlays: values.overlays.map((overlay) => ({
      ...overlay,
      // A blank wash colour is stored as black; an unfinished one is drawn that way too.
      color: isHexColor(overlay.color.trim()) ? overlay.color.trim() : tokens.common.black,
    })),
    garland: { style: values.garland.style, colors: hexOnly(values.garland.colors) },
  };
}
