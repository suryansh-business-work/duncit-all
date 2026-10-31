import type { OccasionGarland, OccasionGarlandStyle } from './occasion-design';
import { cycleColor as cycle, hash01 } from './occasion-random';
import { svgPath } from './occasion-shapes';

/**
 * A garland is a row of small marks hung along the top edge of the screen:
 * string lights, bunting, a marigold toran, spider webs in the corners or
 * icicles. This module turns a style into positioned marks for a given width,
 * so the canvas (web) and SVG (native) renderers draw the same garland.
 */

/** One positioned mark: path data in its own coordinates, placed at (x, y) and turned by `rotate` radians. */
export interface OccasionMark {
  d: string;
  x: number;
  y: number;
  rotate: number;
  /** Hex fill; '' paints none. */
  fill: string;
  /** Hex outline; '' paints none. */
  stroke: string;
  stroke_width: number;
  /** 0–1 base opacity — a bulb's halo is faint, the bulb itself solid. */
  alpha: number;
  /** Phase (0–1) of a slow glow pulse; null holds steady. */
  twinkle: number | null;
}

/** How far below the top edge a garland may hang, in px. */
export const GARLAND_DEPTH = 48;

/** Each style's own colours, used when the look gives none. */
export const GARLAND_DEFAULT_COLORS: Readonly<Record<Exclude<OccasionGarlandStyle, 'NONE'>, readonly string[]>> = {
  STRING_LIGHTS: ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB'],
  BUNTING: ['#FF9933', '#FFFFFF', '#138808'],
  MARIGOLD: ['#FF8F00', '#FFC107'],
  SPIDER_WEB: ['#D9D4E3'],
  ICICLES: ['#FFFFFF', '#E1F5FE', '#B3E5FC'],
};

const WIRE = '#3B3B3B';
const LEAF_GREEN = '#2E7D32';
const HOOK_Y = 3;
const SAG = 12;
const SPAN = 140;

interface Swag {
  /** The wire's path data, one quadratic swag per span. */
  wire: string;
  /** A point (and the wire's slope there) at `u` (0–1) along span `span`. */
  at: (span: number, u: number) => { x: number; y: number; slope: number };
  spans: number;
  spanWidth: number;
}

/** The wire the marks hang from: equal swags between hooks along the top edge. */
function swag(width: number): Swag {
  const spans = Math.max(1, Math.round(width / SPAN));
  const spanWidth = width / spans;
  const control = HOOK_Y + SAG * 2;
  const wire = Array.from({ length: spans }, (_, i) => {
    const x0 = i * spanWidth;
    const start = i === 0 ? ['M', x0, HOOK_Y] : [];
    return svgPath(...start, 'Q', x0 + spanWidth / 2, control, x0 + spanWidth, HOOK_Y);
  }).join(' ');
  const at = (span: number, u: number) => {
    const x0 = span * spanWidth;
    const y = (1 - u) * (1 - u) * HOOK_Y + 2 * (1 - u) * u * control + u * u * HOOK_Y;
    // dy/dx of the quadratic swag: the mark tilts with the wire it hangs on.
    const slope = Math.atan2(2 * (1 - 2 * u) * (control - HOOK_Y), spanWidth);
    return { x: x0 + u * spanWidth, y, slope };
  };
  return { wire, at, spans, spanWidth };
}

const wireMark = (d: string, stroke = WIRE): OccasionMark => ({
  d,
  x: 0,
  y: 0,
  rotate: 0,
  fill: '',
  stroke,
  stroke_width: 1.4,
  alpha: 1,
  twinkle: null,
});

const mark = (d: string, x: number, y: number, rotate: number, fill: string, twinkle: number | null = null, alpha = 1): OccasionMark => ({
  d,
  x,
  y,
  rotate,
  fill,
  stroke: '',
  stroke_width: 0,
  alpha,
  twinkle,
});

/** Marks spaced about `gap` px apart along every swag, each handed its running index. */
function along(s: Swag, gap: number, place: (point: { x: number; y: number; slope: number }, n: number) => OccasionMark[]) {
  const perSpan = Math.max(2, Math.round(s.spanWidth / gap));
  return Array.from({ length: s.spans * perSpan }, (_, n) => place(s.at(Math.floor(n / perSpan), ((n % perSpan) + 0.5) / perSpan), n)).flat();
}

const BULB_SOCKET = 'M-2 0h4v3h-4z';
const BULB = 'M0 3c2.8 0 4 2.6 4 4.6A4 4 0 0 1 0 12a4 4 0 0 1-4-4.4C-4 5.6-2.8 3 0 3z';
/** The light a lit bulb throws around itself. */
const BULB_HALO = 'M-9 7.5a9 9 0 1 0 18 0a9 9 0 1 0-18 0z';
/** The glint on the glass that makes a bulb look round. */
const BULB_GLINT = 'M-2.4 6.6a1 1.6 0 1 0 2 0a1 1.6 0 1 0-2 0z';

/** Glowing bulbs on a sagging wire: halo, glass, a glint, each bulb pulsing in its own time. */
function stringLights(width: number, colors: readonly string[]): OccasionMark[] {
  const s = swag(width);
  return [
    wireMark(s.wire),
    ...along(s, 26, (p, n) => {
      const color = cycle(colors, n);
      const pulse = hash01(n, 11);
      const tilt = p.slope * 0.5;
      return [
        mark(BULB_HALO, p.x, p.y, tilt, color, pulse, 0.3),
        mark(BULB_SOCKET, p.x, p.y, tilt, WIRE),
        mark(BULB, p.x, p.y, tilt, color, pulse),
        mark(BULB_GLINT, p.x, p.y, tilt, '#FFFFFF', null, 0.75),
      ];
    }),
  ];
}

const FLAG = 'M-9 0H9L0 15Z';

function bunting(width: number, colors: readonly string[]): OccasionMark[] {
  const s = swag(width);
  return [wireMark(s.wire), ...along(s, 24, (p, n) => [mark(FLAG, p.x, p.y, p.slope, cycle(colors, n))])];
}

/** Eight petals round a centre, about 11px across. */
const FLOWER =
  'M-5.5 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z M.3 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z M-2.6-2.9a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z M-2.6 2.9a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z';
const FLOWER_HEART = 'M-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0z';
const MANGO_LEAF = 'M0 0C4 6 4 14 0 22C-4 14-4 6 0 0Z';
const LEAF_VEIN = 'M0 1.5V20';

/** A toran: marigolds strung edge to edge, shaded at the heart, a veined mango leaf under every other one. */
function marigold(width: number, colors: readonly string[]): OccasionMark[] {
  const s = swag(width);
  return [
    wireMark(s.wire, LEAF_GREEN),
    ...along(s, 12, (p, n) => {
      const flower = [mark(FLOWER, p.x, p.y, 0, cycle(colors, n)), mark(FLOWER_HEART, p.x, p.y, 0, '#BF360C', null, 0.45)];
      if (n % 2 !== 0) return flower;
      const leaf = mark(MANGO_LEAF, p.x, p.y + 3, p.slope * 0.4, LEAF_GREEN);
      const vein = { ...wireMark(LEAF_VEIN, '#A5D6A7'), x: p.x, y: p.y + 3, rotate: leaf.rotate, stroke_width: 0.8, alpha: 0.7 };
      return [leaf, vein, ...flower];
    }),
  ];
}

const SPIDER_BODY = 'M-3.5 3a3.5 4.5 0 1 0 7 0a3.5 4.5 0 1 0-7 0z M-2.2-3a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0z';
const SPIDER_LEGS = 'M-3 1L-8-3L-10 0 M-3 3L-9 2L-11 6 M-3 5L-8 7L-9 11 M3 1L8-3L10 0 M3 3L9 2L11 6 M3 5L8 7L9 11';
const WEB_SPOKES = 5;
const WEB_RINGS = [0.3, 0.55, 0.8, 1];

/** One corner web as stroke path data: spokes out of the corner, rings sagging toward it. */
function webPath(radius: number, mirror: (x: number) => number): string {
  const point = (spoke: number, r: number) => {
    const angle = (spoke / (WEB_SPOKES - 1)) * (Math.PI / 2);
    return { x: mirror(Math.cos(angle) * r), y: Math.sin(angle) * r };
  };
  const spokes = Array.from({ length: WEB_SPOKES }, (_, i) => {
    const end = point(i, radius);
    return svgPath('M', mirror(0), 0, 'L', end.x, end.y);
  });
  const rings = WEB_RINGS.map((ring) => {
    const r = radius * ring;
    const start = point(0, r);
    const segments = Array.from({ length: WEB_SPOKES - 1 }, (_, i) => {
      const end = point(i + 1, r);
      const mid = point(i + 0.5, r * 0.86);
      return svgPath('Q', mid.x, mid.y, end.x, end.y);
    });
    return svgPath('M', start.x, start.y, ...segments);
  });
  return [...spokes, ...rings].join(' ');
}

/** Webs in both top corners and a small spider let down from the right one. */
function spiderWebs(width: number, colors: readonly string[]): OccasionMark[] {
  const radius = Math.min(120, width * 0.28);
  const color = cycle(colors, 0);
  const web = (d: string) => ({ ...wireMark(d, color), stroke_width: 1 });
  const spiderX = width - radius * 0.55;
  const drop = Math.min(GARLAND_DEPTH + 20, radius * 0.7);
  return [
    web(webPath(radius, (x) => x)),
    web(webPath(radius, (x) => width - x)),
    web(svgPath('M', spiderX, 0, 'V', drop)),
    mark(SPIDER_BODY, spiderX, drop + 4, 0, '#1A0F24'),
    { ...wireMark(SPIDER_LEGS, '#1A0F24'), x: spiderX, y: drop + 4 },
  ];
}

const SNOW_CAP_DEPTH = 5;

/** A drift of snow along the top with icicles of uneven length hanging from it. */
function icicles(width: number, colors: readonly string[]): OccasionMark[] {
  const count = Math.max(4, Math.round(width / 18));
  const gap = width / count;
  const scallops = Array.from({ length: count }, (_, i) => svgPath('Q', width - (i + 0.5) * gap, SNOW_CAP_DEPTH + 4, width - (i + 1) * gap, SNOW_CAP_DEPTH));
  const cap = svgPath('M', 0, 0, 'H', width, 'V', SNOW_CAP_DEPTH, ...scallops, 'Z');
  const drops = Array.from({ length: count }, (_, i) => {
    const length = 8 + hash01(i, 5) * 22;
    const x = (i + 0.5) * gap;
    // A streak of light down one side is what turns a triangle into ice.
    const shine = { ...wireMark(svgPath('M', -1.2, 1, 'L', -0.3, length * 0.7), '#FFFFFF'), x, y: SNOW_CAP_DEPTH, stroke_width: 1, alpha: 0.8 };
    return [mark(svgPath('M', -3.5, 0, 'L', 3.5, 0, 'L', 0, length, 'Z'), x, SNOW_CAP_DEPTH, 0, cycle(colors, i + 1), null, 0.9), shine];
  }).flat();
  return [...drops, mark(cap, 0, 0, 0, cycle(colors, 0))];
}

const GARLANDS: Readonly<Record<Exclude<OccasionGarlandStyle, 'NONE'>, (width: number, colors: readonly string[]) => OccasionMark[]>> = {
  STRING_LIGHTS: stringLights,
  BUNTING: bunting,
  MARIGOLD: marigold,
  SPIDER_WEB: spiderWebs,
  ICICLES: icicles,
};

/** The garland's marks for a screen `width` px wide; none for `NONE` or a style this build does not know. */
export function garlandMarks(garland: OccasionGarland, width: number): OccasionMark[] {
  if (garland.style === 'NONE' || !(garland.style in GARLANDS) || width <= 0) return [];
  const colors = garland.colors.length > 0 ? garland.colors : GARLAND_DEFAULT_COLORS[garland.style];
  return GARLANDS[garland.style](width, colors);
}

/** A twinkling mark's opacity at `t` seconds — a slow glow between 45% and full. */
export function twinkleAlpha(phase: number | null, t: number): number {
  if (phase === null) return 1;
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(((t / 1.6 + phase) * Math.PI * 2)));
}
