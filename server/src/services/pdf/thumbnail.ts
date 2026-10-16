import { logs } from '@observability/log';
import { PDF_PALETTE } from './document';

/**
 * Line-item photos on an invoice: the pod's cover next to the pod, the product
 * shot next to a product, the dish next to a dish.
 *
 * A photo is decoration, so nothing here can fail a document. A line without
 * one — or whose photo would not load — gets a tile with its initial instead,
 * so a mixed table still reads as one column.
 */

/** Side of the square a thumbnail is drawn into, in points. */
export const PDF_THUMB_SIZE = 36;
/** Gap between the thumbnail and the line's name. */
export const PDF_THUMB_GAP = 10;

/** Only our own media CDN is fetched: a stored URL is never a way to make the server call an arbitrary host. Mirrors IMAGEKIT_URL in @duncit/utils (the server has no @duncit deps). */
const IMAGEKIT_URL = /^https:\/\/([^/?#]*\.)?imagekit\.io(:\d+)?[/?#]/i;
/** A thumbnail is a few KB once ImageKit has resized it; anything this big is not one. */
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 4000;
/** More photos than this on one invoice are drawn as initial tiles; the fetches would only slow the download. */
const MAX_PHOTOS = 40;

/**
 * The address to fetch: a small square JPEG cut by ImageKit. pdfkit can embed
 * only JPEG and PNG, and an upload may be stored as WebP or HEIC, so the format
 * is asked for explicitly. An address that already carries a transformation is
 * left as it is.
 */
export function pdfThumbUrl(url: string): string {
  const raw = url.trim();
  if (/[?&]tr=/i.test(raw)) return raw;
  return `${raw}${raw.includes('?') ? '&' : '?'}tr=w-144,h-144,f-jpg`;
}

async function fetchThumb(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(pdfThumbUrl(url), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      logs.server.warn('pdf', 'thumbnail', { url, status: res.status });
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_BYTES ? bytes : null;
  } catch (error) {
    // Logged, not thrown: the line still prints, with its initial tile.
    logs.server.warn('pdf', 'thumbnail', { url, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Every distinct line photo, fetched in parallel, keyed by the stored URL.
 * A URL missing from the map is drawn as an initial tile.
 */
export async function loadPdfThumbs(urls: ReadonlyArray<string | undefined>): Promise<Map<string, Buffer>> {
  const wanted = [...new Set(urls.filter((url): url is string => !!url && IMAGEKIT_URL.test(url)))].slice(0, MAX_PHOTOS);
  const loaded = await Promise.all(wanted.map(async (url) => [url, await fetchThumb(url)] as const));
  return new Map(loaded.filter((entry): entry is readonly [string, Buffer] => entry[1] !== null));
}

/** The tile drawn in place of a missing photo: the line's initial on the soft accent. */
function drawInitialTile(doc: PDFKit.PDFDocument, label: string, x: number, y: number): void {
  const size = PDF_THUMB_SIZE;
  doc.roundedRect(x, y, size, size, 8).fill(PDF_PALETTE.accentSoft);
  const initial = label.trim().charAt(0).toUpperCase() || '#';
  doc
    .fillColor(PDF_PALETTE.accent)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(initial, x, y + (size - 14) / 2 + 1, { width: size, align: 'center', lineBreak: false });
}

/**
 * One thumbnail at (x, y), cropped to a rounded square. Falls back to the
 * initial tile when there is no photo or pdfkit cannot read the bytes. Leaves
 * the font and fill changed — the caller sets its own before the next text.
 */
export function drawPdfThumb(doc: PDFKit.PDFDocument, photo: Buffer | undefined, label: string, x: number, y: number): void {
  const size = PDF_THUMB_SIZE;
  if (photo) {
    doc.save();
    try {
      doc.roundedRect(x, y, size, size, 8).clip();
      doc.image(photo, x, y, { cover: [size, size], align: 'center', valign: 'center' });
      doc.restore();
      doc.roundedRect(x, y, size, size, 8).lineWidth(0.5).strokeColor(PDF_PALETTE.line).stroke();
      return;
    } catch {
      doc.restore();
    }
  }
  drawInitialTile(doc, label, x, y);
}
