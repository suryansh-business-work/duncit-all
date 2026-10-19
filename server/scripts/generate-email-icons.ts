/**
 * Draw the email icons (`EMAIL_ICONS`) as transparent PNGs.
 *
 *   pnpm --filter server exec ts-node -r tsconfig-paths/register --transpile-only scripts/generate-email-icons.ts
 *
 * Gmail renders neither SVG nor an icon font, so each `@mui/icons-material`
 * glyph is rasterised once, at three times its 24px design size for sharp
 * rendering on a high-density screen, and the PNGs are committed. Run it again
 * only when the icon list or a tone changes. The glyphs are read from mweb's
 * copy of the package — the server deliberately depends on no UI package.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { EMAIL_ICONS } from '../src/services/email/catalogue/icons';
import { EMAIL_ICON_TONE } from '../src/services/email/catalogue/tokens';

const SIZE = 72;
const OUT = path.resolve(__dirname, '../src/services/_assets/email-icons');
const MWEB = path.resolve(__dirname, '../../app/mweb');

/** The `<path>` and `<circle>` shapes of one glyph, read from its CommonJS build. */
function shapes(glyph: string): string[] {
  const file = require.resolve(`@mui/icons-material/${glyph}`, { paths: [MWEB] });
  const source = fs.readFileSync(file, 'utf8');
  const paths = [...source.matchAll(/"path",\s*\{\s*d:\s*"([^"]+)"/g)].map((m) => `<path d="${m[1]}"/>`);
  const circles = [...source.matchAll(/"circle",\s*\{\s*cx:\s*"([^"]+)",\s*cy:\s*"([^"]+)",\s*r:\s*"([^"]+)"/g)].map(
    (m) => `<circle cx="${m[1]}" cy="${m[2]}" r="${m[3]}"/>`
  );
  const found = [...paths, ...circles];
  if (!found.length) throw new Error(`No shapes found in ${glyph}`);
  return found;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, { glyph, tone }] of Object.entries(EMAIL_ICONS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}"><g fill="${EMAIL_ICON_TONE[tone]}">${shapes(glyph).join('')}</g></svg>`;
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${name}.png`));
  }
  console.log(`[email-icons] wrote ${Object.keys(EMAIL_ICONS).length} icons to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
