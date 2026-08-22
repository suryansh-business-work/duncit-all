import crypto from 'node:crypto';

/**
 * The picture half of a captcha: a code drawn so that reading it needs eyes.
 *
 * SVG rather than a raster, because the server has no image library and adding
 * one to draw five characters is a dependency nobody wants to patch. The output
 * is a self-contained data URI, so a form can render it with a plain `<img>` on
 * a static Astro page that has no API of its own.
 *
 * What makes it hostile to a script is the SAME thing in every direction:
 * each glyph is rotated, shifted, resized and recoloured independently, and
 * the strokes crossing them are drawn in the same ink. There is no separable
 * "text layer" to lift out — but the glyphs never overlap each other, so a
 * person still reads it at a glance.
 */

/** No I, L, O, 0 or 1: a captcha nobody can read is a form nobody can send. */
export const CAPTCHA_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CAPTCHA_LENGTH = 5;

const WIDTH = 180;
const HEIGHT = 60;
/** Ink that stays legible on a light plate whatever the page theme is. */
const INK = ['#16131a', '#3b2f4d', '#1f3d5c', '#5c2b2b', '#204a35'];

/** Uniform in [0, max) from the CSPRNG — the code must not be guessable. */
const randInt = (max: number): number => crypto.randomInt(max);

/** Uniform float in [min, max), for the cosmetic wobble only. */
const randFloat = (min: number, max: number): number =>
  min + (crypto.randomInt(1000) / 1000) * (max - min);

/** A fresh code. Exported so the service owns the answer, not the drawing. */
export function generateCaptchaCode(): string {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
    code += CAPTCHA_ALPHABET[randInt(CAPTCHA_ALPHABET.length)];
  }
  return code;
}

/** One glyph, rotated and nudged off the baseline. */
function glyph(char: string, index: number): string {
  const x = 22 + index * 30 + randFloat(-3, 3);
  const y = 40 + randFloat(-5, 5);
  const rotation = randFloat(-28, 28).toFixed(1);
  const size = randFloat(26, 34).toFixed(1);
  const fill = INK[randInt(INK.length)];
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}" font-size="${size}" ` +
    `font-family="Verdana,DejaVu Sans,sans-serif" font-weight="700" ` +
    `transform="rotate(${rotation} ${x.toFixed(1)} ${y.toFixed(1)})">${char}</text>`
  );
}

/** A curve across the plate, in the same ink as the glyphs. */
function strokeLine(): string {
  const points = Array.from({ length: 3 }, () => [randInt(WIDTH), randInt(HEIGHT)]);
  const [c1, c2, end] = points;
  const stroke = INK[randInt(INK.length)];
  return (
    `<path d="M0 ${randInt(HEIGHT)} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${end[0]} ${end[1]}" ` +
    `stroke="${stroke}" stroke-width="${randFloat(0.8, 1.8).toFixed(1)}" fill="none" opacity="0.55"/>`
  );
}

/** Speckle, so an edge detector has more edges than glyphs to consider. */
function speckle(): string {
  return `<circle cx="${randInt(WIDTH)}" cy="${randInt(HEIGHT)}" r="${randFloat(0.6, 1.6).toFixed(1)}" fill="${INK[randInt(INK.length)]}" opacity="0.4"/>`;
}

/** The code drawn as an SVG document. */
export function renderCaptchaSvg(code: string): string {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="#f2f2f4"/>`,
    ...Array.from({ length: 4 }, strokeLine),
    ...[...code].map(glyph),
    ...Array.from({ length: 40 }, speckle),
    '</svg>',
  ];
  return parts.join('');
}

/** The same drawing as a data URI, ready for an `<img src>`. */
export function renderCaptchaImage(code: string): string {
  const svg = Buffer.from(renderCaptchaSvg(code), 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${svg}`;
}
