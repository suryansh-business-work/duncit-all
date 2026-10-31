import type { OccasionParticleLayer } from './occasion-design';

/**
 * The built-in marks a particle layer draws. Server twin: the `OccasionShape`
 * enum in the occasions module — a name added here needs it there too, or the
 * portal cannot save it. A layer can always add its own marks as SVG path data
 * (`custom_paths`), which is how a festival nobody planned for gets its look.
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

export type OccasionShape = (typeof OCCASION_SHAPES)[number];

/** SVG path data from commands and numbers, space-separated — what every path parser reads. */
export const svgPath = (...parts: readonly (string | number)[]): string => parts.join(' ');

/** A full circle of radius r centred on (cx, cy), drawn as two arcs. */
export const svgDisc = (cx: number, cy: number, r: number): string =>
  svgPath('M', cx - r, cy, 'a', r, r, 0, 1, 0, r * 2, 0, 'a', r, r, 0, 1, 0, -r * 2, 0, 'z');

/** Petals of the marigold: eight discs around the centre, wound like the centre so they merge. */
const MARIGOLD_PETALS = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return svgDisc(Math.round((12 + Math.cos(angle) * 5.5) * 100) / 100, Math.round((12 + Math.sin(angle) * 5.5) * 100) / 100, 3.6);
  })
  .join(' ');

/**
 * Every built-in mark as SVG path data in a 24×24 box centred on (12, 12),
 * filled with the nonzero rule: a hole (ring, chakra, ghost's eyes, the gift's
 * ribbon) winds the opposite way to the outline around it. Text glyphs are
 * never used — a mark looks the same on every device.
 */
export const OCCASION_SHAPE_PATHS: Readonly<Record<OccasionShape, string>> = {
  CIRCLE: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  SPARK: 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z',
  STAR: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7z',
  HEART:
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z',
  PETAL: 'M12 2c4 4 6 8 6 12a6 6 0 0 1-12 0c0-4 2-8 6-12z',
  LEAF: 'M4 20C4 10 10 4 20 4c0 10-6 16-16 16z',
  CONFETTI: 'M9 2h6v20H9z',
  SNOWFLAKE:
    'M11 2h2v20h-2z M3.84 6.13L21.16 16.13L20.16 17.87L2.84 7.87z M2.84 16.13L20.16 6.13L21.16 7.87L3.84 17.87z',
  DIYA: 'M12 2c1.8 2.4 2.6 4.2 2.6 5.6a2.6 2.6 0 0 1-5.2 0c0-1.4.8-3.2 2.6-5.6z M2 13h20c-.8 4.4-4.8 7-10 7S2.8 17.4 2 13z',
  FLAME: 'M12 2c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.6-4.8 3-6.4.2 2 1 3.2 2.4 3.6C10.6 7.6 11 4.8 12 2z',
  KITE: 'M12 2l7 8-7 10-7-10z M11.5 20h1v3h-1z',
  MOON: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  LANTERN: 'M10 2h4v2h-4z M7 5h10l1 2v10l-1 2H7l-1-2V7z M9 20h6v2H9z',
  BALLOON: 'M12 2c3.9 0 7 3.6 7 8s-3.6 8-7 8-7-3.6-7-8 3.1-8 7-8z M11 18h2l-.5 1.5h-1z M11.6 19.5h.8V23h-.8z',
  BAT: 'M12 7c.8 0 1.4.6 1.6 1.4L15 7c.6 1.6 2.4 2.6 4.2 2.2L23 8c-1 2.8-1.6 5.6-1.4 8.4-1.2-1-2.8-1.2-4.2-.6-.6-1.4-2-2.2-3.4-2L12 16l-2-2.2c-1.4-.2-2.8.6-3.4 2-1.4-.6-3-.4-4.2.6C2.6 13.6 2 10.8 1 8l3.8 1.2C6.6 9.6 8.4 8.6 9 7l1.4 1.4C10.6 7.6 11.2 7 12 7z',
  FEATHER: 'M12 2c4 3 6 7 6 11s-2.7 7-6 7-6-3-6-7 2-8 6-11z M11.5 14h1v8h-1z',
  DROP: 'M12 2c3.5 5 7 8.6 7 12.5a7 7 0 0 1-14 0C5 10.6 8.5 7 12 2z',
  RING: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10z',
  MODAK:
    'M12 2c1 2.5 3 4 5.5 6.5C20 11 21 14 19.5 17c-1.5 3-4.5 4-7.5 4s-6-1-7.5-4C3 14 4 11 6.5 8.5 9 6 11 4.5 12 2z',
  EGG: 'M12 2c4 0 7 6.5 7 11.5a7 7 0 0 1-14 0C5 8.5 8 2 12 2z',
  CHAKRA:
    'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 3.4a8.6 8.6 0 1 1 0 17.2a8.6 8.6 0 1 1 0-17.2z M11.4 4h1.2v16h-1.2z M4 11.4h16v1.2H4z M6.76 5.92L18.08 17.24L17.24 18.08L5.92 6.76z M5.92 17.24L17.24 5.92L18.08 6.76L6.76 18.08z',
  SUN: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z M11 1h2v4h-2z M11 19h2v4h-2z M1 11h4v2H1z M19 11h4v2h-4z M4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4z M15.6 17l1.4-1.4 2.8 2.8-1.4 1.4z M4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8z M15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z',
  PUMPKIN:
    'M8.5 7a5.5 7 0 1 0 0 14a5.5 7 0 1 0 0-14z M15.5 7a5.5 7 0 1 0 0 14a5.5 7 0 1 0 0-14z M12 6.5a5 7.5 0 1 0 0 15a5 7.5 0 1 0 0-15z M11 2.2v4.8h3.2l-.4-4.8z',
  GHOST:
    'M12 2a7 7 0 0 0-7 7v12l2.33-2 2.34 2L12 19l2.33 2 2.34-2L19 21V9a7 7 0 0 0-7-7z M8.2 9.5a1.3 1.3 0 1 1 2.6 0a1.3 1.3 0 1 1-2.6 0z M13.2 9.5a1.3 1.3 0 1 1 2.6 0a1.3 1.3 0 1 1-2.6 0z',
  GIFT: 'M3 10h18v3H3z M4.5 13h15v9h-15z M11 10v12h2V10z M12 10c-2-4-7-5-6-1.5C6.5 10 12 10 12 10z M12 10c2-4 7-5 6-1.5C17.5 10 12 10 12 10z',
  BELL: 'M12 2.5c-.8 0-1.5.7-1.5 1.5v.6C7.6 5.4 5.6 8 5.6 11.2V16l-2.1 2.2v1h17v-1L18.4 16v-4.8c0-3.2-2-5.8-4.9-6.6V4c0-.8-.7-1.5-1.5-1.5z M12 23a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 23z',
  CANDY_CANE: 'M8 22V9a5 5 0 0 1 10 0v2h-3V9a2 2 0 0 0-4 0v13z',
  TREE: 'M12 1.5l4.5 6h-2.2l4.2 5.5h-2.4l4.4 6H13.5V22h-3v-3H3.5l4.4-6H5.5l4.2-5.5H7.5z',
  ORNAMENT: 'M10 2.5h4v3h-4z M12 5.5a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  MARIGOLD: svgPath(MARIGOLD_PETALS, svgDisc(12, 12, 4)),
};

/** A built-in shape name this build can draw (a newer server's name is not one). */
export function isOccasionShape(name: string): name is OccasionShape {
  return (OCCASION_SHAPES as readonly string[]).includes(name);
}

/**
 * The path data a particle layer draws: its built-in shapes first (unknown
 * names skipped), then its own custom paths. Empty when it has nothing
 * drawable — the renderers then draw nothing for it.
 */
export function occasionLayerPaths(layer: Pick<OccasionParticleLayer, 'shapes' | 'custom_paths'>): string[] {
  const builtIn = layer.shapes.filter(isOccasionShape).map((name) => OCCASION_SHAPE_PATHS[name]);
  const custom = layer.custom_paths.map((path) => path.trim()).filter((path) => path !== '');
  return [...builtIn, ...custom];
}
