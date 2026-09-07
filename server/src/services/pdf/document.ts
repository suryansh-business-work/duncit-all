import PDFDocument from 'pdfkit';

/**
 * Draw a pdfkit document and get its bytes.
 *
 * Every PDF generator in the product opened with the same fifteen lines: make
 * the document, collect `data` into an array, resolve on `end`, reject on
 * `error`, and wrap the lot in a try/catch so a throw inside the drawing code
 * rejects instead of hanging the promise for ever. Eight copies of that is
 * eight places for the leak to come back (rule 40).
 *
 * The caller does nothing but draw. `doc.end()` is called here, so a generator
 * cannot forget it and leave a request waiting on a promise that never settles.
 */
export function renderPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      draw(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Symbols the 14 built-in PDF fonts cannot draw, and what to print instead.
 *
 * pdfkit's Helvetica is WinAnsi-encoded, which has no rupee sign (U+20B9) —
 * `₹1,000` comes out as a stray mark followed by the number, which on a
 * financial document reads as a rendering fault. Until a Unicode font is
 * embedded, the ISO code is the honest substitute.
 */
const UNPRINTABLE_CURRENCY: Record<string, string> = {
  '₹': 'INR ',
  '₽': 'RUB ',
  '₩': 'KRW ',
  '₪': 'ILS ',
  '₫': 'VND ',
  '₴': 'UAH ',
  '₦': 'NGN ',
  '₱': 'PHP ',
};

/**
 * A currency symbol the built-in fonts can actually draw.
 *
 * `$`, `£`, `¥` and `€` are all in WinAnsi and pass through untouched; the ones
 * that are not are swapped for their code. Every PDF in the product
 * interpolates the admin's `currency_symbol` into a standard font, so this is
 * the one place that decision should live (rule 40).
 */
export const pdfCurrency = (symbol: string): string =>
  UNPRINTABLE_CURRENCY[symbol] ?? symbol;

/**
 * A branding image for a PDF, or null.
 *
 * Null on anything at all — no URL, a 404, a DNS failure, a timeout — because
 * a logo is decoration and a missing one must never be the reason an invoice or
 * a payout statement fails to render.
 */
export async function loadPdfImage(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
