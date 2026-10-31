import type { OccasionFlyer, OccasionVectorLayer } from './occasion-design';
import { svgDisc as disc, svgPath } from './occasion-shapes';

/** A vector picture: layers painted in order inside a `width × height` box, facing right. */
export interface OccasionArtwork {
  width: number;
  height: number;
  layers: readonly OccasionVectorLayer[];
}

/**
 * The built-in flyers. Server twin: the `OccasionArtwork` enum (plus its
 * `CUSTOM` and `IMAGE`), so a name added here needs it there too.
 */
export const OCCASION_ARTWORK_NAMES = ['SANTA_SLEIGH', 'WITCH_BROOM', 'KITE', 'HOT_AIR_BALLOON', 'SHOOTING_STAR'] as const;

export type OccasionArtworkName = (typeof OCCASION_ARTWORK_NAMES)[number];

/** The box a `CUSTOM` flyer's own layers are drawn in. */
export const CUSTOM_ARTWORK_BOX = { width: 240, height: 120 } as const;

interface Paint {
  fill?: string;
  stroke?: string;
  width?: number;
}

/** One layer, placed at (x, y) inside the artwork. */
const layer = (path: string, paint: Paint, x = 0, y = 0): OccasionVectorLayer => ({
  path,
  fill: paint.fill ?? '',
  stroke: paint.stroke ?? '',
  stroke_width: paint.width ?? 0,
  x,
  y,
});

const REINDEER_COAT = '#8D5A3B';
const REINDEER_LEGS = '#6D4C41';
const ANTLER = '#5D4037';

/** A galloping reindeer, about 64×46, at (x, y); the lead one wears the red nose. */
function reindeer(x: number, y: number, lead: boolean): OccasionVectorLayer[] {
  return [
    layer('M8.5 19L2.5 16.5L4.5 22Z', { fill: '#F5E6D3' }, x, y),
    layer('M14 27L4.5 35.5L2.5 33L11 25.5Z M18 29L13 41.5L10 40.5L15 28.5Z', { fill: REINDEER_LEGS }, x, y),
    layer('M45 28L55 37L53 39.5L42 31Z M41 29L46.5 41L43.5 42L38 31Z', { fill: REINDEER_LEGS }, x, y),
    layer('M8 22C8 15 16 12 28 12L40 12C48 12 52 16 52 22C52 28 46 31 38 31L18 31C11 31 8 28 8 22Z', { fill: REINDEER_COAT }, x, y),
    layer('M42 18L47 6C48.5 2.5 52 1 56 2L62.5 4C64.5 4.8 64.5 8 62.5 8.8L56.5 10L52 21Z M53 2.5L50 0L52.5 4Z', { fill: REINDEER_COAT }, x, y),
    layer('M54 2L51.5-7 M52.4-3.5L48-6 M51.8-5.5L54.5-10 M57.5 2.5L60-6 M59.2-3L63.5-5.5', { stroke: ANTLER, width: 1.8 }, x, y),
    layer('M38 12.5L41.5 30.5', { stroke: '#C62828', width: 2.4 }, x, y),
    layer(disc(58.6, 4.6, 0.9), { fill: '#1B0F0A' }, x, y),
    layer(disc(63.6, 6.6, lead ? 2.2 : 1.4), { fill: lead ? '#FF1744' : '#3E2723' }, x, y),
  ];
}

const SANTA_RED = '#D32F2F';
const SLEIGH_RED = '#B71C1C';
const GOLD = '#F2C14E';
const WHITE = '#FFFFFF';

/** Santa in his sleigh, a sack of gifts behind him, two reindeer climbing ahead. */
const SANTA_SLEIGH: OccasionArtwork = {
  width: 240,
  height: 80,
  layers: [
    layer('M92 27C112 36 132 50 150 50 M150 50C172 48 194 38 212 37', { stroke: '#6D4C41', width: 1.4 }),
    ...reindeer(110, 30, false),
    ...reindeer(172, 16, true),
    layer('M6 40C4 26 12 16 22 16C32 16 36 26 34 40Z', { fill: '#8D6E63' }),
    layer('M18 16L26 16L24 12L20 12Z', { fill: '#5D4037' }),
    layer('M30 30h12v10H30z', { fill: '#2E7D32' }),
    layer('M35 30h2v10h-2z', { fill: '#FDD835' }),
    layer('M40 40C40 26 46 18 56 18C66 18 72 26 72 40Z', { fill: SANTA_RED }),
    layer('M54 20h4v20h-4z', { fill: WHITE }),
    layer('M64 28C72 30 80 30 88 27', { stroke: SANTA_RED, width: 6 }),
    layer(disc(90, 27, 3.5), { fill: '#263238' }),
    layer(disc(57, 14, 6.5), { fill: '#F8C9A0' }),
    layer('M49.5 14C49.5 24 54 29 57 29C60 29 64.5 24 64.5 14C61 18 53 18 49.5 14Z', { fill: WHITE }),
    layer(disc(60.5, 14.5, 1.6), { fill: '#E57373' }),
    layer(disc(59, 11.5, 0.9), { fill: '#3E2723' }),
    layer('M50 10C50 3 54 0 58 0C62 0 65 4 64.5 10Z M53 3C47 1 42 4 40 9L43 10.5C45 7 48 5.5 54 6Z', { fill: SANTA_RED }),
    layer(svgPath(disc(40.5, 10, 3), 'M50.5 8.5h13.5a1.8 1.8 0 0 1 0 3.6H50.5a1.8 1.8 0 0 1 0-3.6z'), { fill: WHITE }),
    layer(
      'M2 48C2 42 6 40 12 40L84 40C92 40 96 34 96 26C96 22 100 20 102 23C104 30 102 44 96 52C90 60 82 64 70 64L18 64C8 64 2 58 2 48Z',
      { fill: SLEIGH_RED },
    ),
    layer(svgPath('M6 54H92C90 57 88 58 86 58H8C7 57 6 56 6 54Z', disc(101, 23, 2.5)), { fill: GOLD }),
    layer('M0 74H88C98 74 104 70 106 62 M20 64V74 M70 64V74', { stroke: '#C9A227', width: 3.5 }),
  ],
};

const CLOAK = '#2B1640';
const WITCH_SKIN = '#8BC34A';
const PUMPKIN_ORANGE = '#FF7A1A';
const CAT = '#1A0F24';

/** A witch on her broom with her cat riding behind, hat band and hair in pumpkin orange. */
const WITCH_BROOM: OccasionArtwork = {
  width: 130,
  height: 90,
  layers: [
    layer('M30 66L170 52', { stroke: '#6D4C41', width: 3.5 }),
    layer('M32 66L6 54L2 64L4 76L8 84L34 70Z', { fill: '#C8A165' }),
    layer('M30 62L34 71', { stroke: '#8D6E63', width: 3 }),
    layer(svgPath('M44 62C44 54 48 50 54 50C60 50 62 56 62 62Z', disc(58, 46, 5), 'M54 43L55 37L58 42Z M59 41L62 36L63 43Z'), { fill: CAT }),
    layer('M44 60C38 58 36 50 40 46', { stroke: CAT, width: 2 }),
    layer(svgPath(disc(56.5, 45.5, 0.9), disc(60, 45.5, 0.9)), { fill: '#FFEB3B' }),
    layer('M84 40C66 38 50 46 40 58C56 60 70 58 86 54Z', { fill: '#3C1F5C' }),
    layer('M80 60C76 44 80 32 92 30L100 32C106 42 104 54 100 60Z', { fill: CLOAK }),
    layer('M90 59L94 72L104 72L104 68L98 67L96 58Z', { fill: CAT }),
    layer('M98 38L116 50', { stroke: CLOAK, width: 4.5 }),
    layer(svgPath(disc(117.5, 51, 2.4), disc(97, 22, 7)), { fill: WITCH_SKIN }),
    layer('M103 21L110 23.5L103 25.5Z', { fill: '#7CB342' }),
    layer('M90 18C84 22 82 30 84 36C86 30 88 26 92 24Z M91 22C87 28 87 34 89 38C90 32 91 28 94 26Z', { fill: PUMPKIN_ORANGE }),
    layer('M82 17L114 13L114.5 16.5L82.5 20.5Z M89 17C92 6 99-2 108-6C103 2 101 9 103 15.5Z', { fill: CLOAK }),
    layer('M89.6 14.5L102.6 12.8L103 15.6L89.2 17.2Z', { fill: PUMPKIN_ORANGE }),
    layer(disc(100, 20.5, 1.1), { fill: '#FFEB3B' }),
  ],
};

/** A patang in four colours with its bow-tied tail. */
const KITE: OccasionArtwork = {
  width: 100,
  height: 130,
  layers: [
    layer('M50 88C42 98 58 106 48 116C40 124 52 128 46 132', { stroke: '#5D4037', width: 1.2 }),
    layer('M50 4L50 46L16 46Z', { fill: '#E53935' }),
    layer('M50 4L84 46L50 46Z', { fill: '#FDD835' }),
    layer('M16 46L50 46L50 88Z', { fill: '#1E88E5' }),
    layer('M50 46L84 46L50 88Z', { fill: '#43A047' }),
    layer('M50 4V88 M16 46Q50 36 84 46', { stroke: '#5D4037', width: 1.5 }),
    layer('M44 98L38 94L38 102Z M48 98L54 94L54 102Z', { fill: '#E53935' }),
    layer('M48 113L42 109L42 117Z M52 113L58 109L58 117Z', { fill: '#FDD835' }),
  ],
};

/** A striped hot-air balloon and its basket. */
const HOT_AIR_BALLOON: OccasionArtwork = {
  width: 90,
  height: 115,
  layers: [
    layer('M36 86L39 100 M54 86L51 100', { stroke: '#5D4037', width: 1 }),
    layer('M45 4C22 4 6 22 6 44C6 62 22 76 34 86H56C68 76 84 62 84 44C84 22 68 4 45 4Z', { fill: '#E53935' }),
    layer('M45 4C36 4 30 22 30 44C30 62 36 76 40 86H50C54 76 60 62 60 44C60 22 54 4 45 4Z', { fill: '#FDD835' }),
    layer('M45 4C42 4 40 22 40 44C40 62 42 76 43 86H47C48 76 50 62 50 44C50 22 48 4 45 4Z', { fill: '#1E88E5' }),
    layer('M37 100H53L51.5 112H38.5Z', { fill: '#8D6E63' }),
    layer('M37 100H53V103H37Z', { fill: '#5D4037' }),
  ],
};

/** A bright star; give the flyer a trail colour and it streaks across the sky. */
const SHOOTING_STAR: OccasionArtwork = {
  width: 40,
  height: 40,
  layers: [
    layer('M20 2l4.8 10.4 11.4 1.2-8.6 7.6 2.4 11.2L20 26.6 10 32.4l2.4-11.2L3.8 13.6l11.4-1.2z', { fill: '#FFD54F' }),
    layer('M20 9l2.4 5.2 5.7.6-4.3 3.8 1.2 5.6L20 21.3 15 24.2l1.2-5.6-4.3-3.8 5.7-.6z', { fill: '#FFF8E1' }),
  ],
};

export const OCCASION_ARTWORKS: Readonly<Record<OccasionArtworkName, OccasionArtwork>> = {
  SANTA_SLEIGH,
  WITCH_BROOM,
  KITE,
  HOT_AIR_BALLOON,
  SHOOTING_STAR,
};

/** A built-in artwork this build can draw. */
export function isOccasionArtwork(name: string): name is OccasionArtworkName {
  return (OCCASION_ARTWORK_NAMES as readonly string[]).includes(name);
}

/**
 * The vector picture a flyer draws: its built-in artwork, or its own layers in
 * the custom box. Null for an `IMAGE` flyer (the renderer draws `image_url`), a
 * `CUSTOM` one with no layers, or a name this build does not know.
 */
export function occasionArtwork(flyer: Pick<OccasionFlyer, 'artwork' | 'custom_layers'>): OccasionArtwork | null {
  if (flyer.artwork === 'CUSTOM') {
    return flyer.custom_layers.length > 0 ? { ...CUSTOM_ARTWORK_BOX, layers: flyer.custom_layers } : null;
  }
  return isOccasionArtwork(flyer.artwork) ? OCCASION_ARTWORKS[flyer.artwork] : null;
}
