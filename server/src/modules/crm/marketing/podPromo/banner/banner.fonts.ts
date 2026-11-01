import fs from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import { logs } from '@observability/log';
import type { FontRole } from './banner.theme';

/**
 * The banner typefaces, and text turned into vector outlines.
 *
 * Text is never left to the SVG renderer's font lookup: librsvg (sharp's SVG
 * path) resolves families through fontconfig and ignores @font-face, so the
 * same SVG printed one face on a laptop and a fallback sans on the Alpine
 * server image. Instead every line is laid out here with fontkit, from the
 * font files bundled under services/_assets (all SIL Open Font License, the
 * licence beside each), and drawn as <path> outlines. The renderer then has
 * nothing to look up, the result is identical everywhere, and the widths the
 * wrapping measures are the widths that get drawn.
 *
 * A character a face lacks (₹ in a Latin-only cut, say) is drawn from the
 * next face in the chain rather than as a box.
 */
const ASSETS = path.resolve(__dirname, '../../../../../services/_assets');

const FILES: Record<FontRole, string> = {
  display: 'fonts/Anton-Regular.ttf',
  serif: 'fonts/DMSerifDisplay-Regular.ttf',
  sans: 'quicksand-latin-500.woff',
  sans_bold: 'quicksand-latin-700.woff',
};

/** Where a missing glyph is looked for next. */
const FALLBACK_CHAIN: readonly FontRole[] = ['sans_bold', 'display', 'serif', 'sans'];

let loaded: Map<FontRole, fontkit.Font> | null = null;

function openFont(role: FontRole): fontkit.Font | null {
  try {
    const font = fontkit.create(fs.readFileSync(path.join(ASSETS, FILES[role])));
    return 'unitsPerEm' in font ? font : null;
  } catch (error) {
    logs.server.error('pod-promo-banner', 'openFont', { error, role, msg: 'a banner font could not be loaded' });
    return null;
  }
}

function fonts(): Map<FontRole, fontkit.Font> {
  if (loaded) return loaded;
  const map = new Map<FontRole, fontkit.Font>();
  for (const role of Object.keys(FILES) as FontRole[]) {
    const font = openFont(role);
    if (font) map.set(role, font);
  }
  if (map.size === 0) throw new Error('No banner font could be loaded from services/_assets');
  loaded = map;
  return map;
}

/** The face that draws this character: the role's own, else the first in the chain that has it. */
function faceFor(role: FontRole, codePoint: number): fontkit.Font {
  const all = fonts();
  const own = all.get(role);
  if (own?.hasGlyphForCodePoint(codePoint)) return own;
  for (const next of FALLBACK_CHAIN) {
    const font = all.get(next);
    if (font?.hasGlyphForCodePoint(codePoint)) return font;
  }
  return own ?? [...all.values()][0];
}

interface Segment {
  font: fontkit.Font;
  text: string;
}

/** The text cut into runs that one face draws, so kerning works inside each run. */
function segments(text: string, role: FontRole): Segment[] {
  const out: Segment[] = [];
  for (const char of text) {
    const font = faceFor(role, char.codePointAt(0) ?? 0);
    const last = out.at(-1);
    if (last && last.font === font) last.text += char;
    else out.push({ font, text: char });
  }
  return out;
}

/** Width in px of one line at this size. */
export function measure(text: string, role: FontRole, size: number): number {
  return segments(text, role).reduce((width, seg) => width + (seg.font.layout(seg.text).advanceWidth * size) / seg.font.unitsPerEm, 0);
}

/** How far above the baseline capitals reach, as a share of the size — for vertical centring. */
export function capHeight(role: FontRole): number {
  const font = fonts().get(role) ?? [...fonts().values()][0];
  return font.capHeight > 0 ? font.capHeight / font.unitsPerEm : 0.7;
}

/** SVG path data for one line whose left end of the baseline is at (x, y). */
export function linePath(text: string, role: FontRole, size: number, x: number, y: number): string {
  let cursor = x;
  let d = '';
  for (const seg of segments(text, role)) {
    const scale = size / seg.font.unitsPerEm;
    const run = seg.font.layout(seg.text);
    run.glyphs.forEach((glyph, index) => {
      const position = run.positions[index];
      d += glyph.path
        .scale(scale, -scale)
        .translate(cursor + position.xOffset * scale, y - position.yOffset * scale)
        .toSVG();
      cursor += position.xAdvance * scale;
    });
  }
  return d;
}
