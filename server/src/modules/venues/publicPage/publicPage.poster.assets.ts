import fs from 'node:fs';
import path from 'node:path';

/**
 * The poster's bundled brand files, read once at start-up.
 *
 * The wordmark is the "duncit" lettering keyed out of the square brand logo —
 * a transparent PNG at print resolution, so nothing is processed per request.
 * Quicksand is the product's own typeface (theme.fontFamily in
 * @duncit/auth-tokens), embedded under the SIL Open Font License; its licence
 * text sits beside it in services/_assets.
 */
const ASSETS = path.resolve(__dirname, '../../../services/_assets');

/** Null when the file is absent: the poster then prints without that piece. */
function read(file: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(ASSETS, file));
  } catch {
    return null;
  }
}

const WORDMARK_RED = read('duncit-wordmark-red.png');
const FONT_BOLD = read('quicksand-latin-700.woff');
const FONT_MEDIUM = read('quicksand-latin-500.woff');

export interface PosterFonts {
  bold: string;
  medium: string;
}

/** pdfkit throws on a font or image it cannot decode; decoration never fails the poster. */
export function attempt(draw: () => void): boolean {
  try {
    draw();
    return true;
  } catch {
    return false;
  }
}

function fontOr(
  doc: PDFKit.PDFDocument,
  name: string,
  source: Buffer | null,
  fallback: string,
): string {
  if (!source) return fallback;
  const usable = attempt(() => {
    doc.registerFont(name, source);
    doc.font(name);
  });
  return usable ? name : fallback;
}

/** The names to pass to `doc.font()`: Quicksand, or Helvetica when it cannot load. */
export function posterFonts(doc: PDFKit.PDFDocument): PosterFonts {
  return {
    bold: fontOr(doc, 'poster-bold', FONT_BOLD, 'Helvetica-Bold'),
    medium: fontOr(doc, 'poster-medium', FONT_MEDIUM, 'Helvetica'),
  };
}

/** The red wordmark, `height` points tall, its top-left corner at (x, y). */
export function drawWordmark(doc: PDFKit.PDFDocument, x: number, y: number, height: number): void {
  if (!WORDMARK_RED) return;
  const mark = WORDMARK_RED;
  attempt(() => doc.image(mark, x, y, { height }));
}
