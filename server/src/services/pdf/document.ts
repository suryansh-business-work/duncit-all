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
 *
 * `options` is for the one thing a multi-page document needs that a single page
 * does not: `bufferPages`, so "Page x of y" can be written once y is known.
 */
export function renderPdf(
  draw: (doc: PDFKit.PDFDocument) => void,
  options: PDFKit.PDFDocumentOptions = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, ...options });
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

/** The Duncit brand palette every PDF draws with — the values the invoice,
 * payout and policy documents already print, named once for new documents. */
export const PDF_PALETTE = {
  accent: '#ff4f73',
  accentSoft: '#fff1f4',
  ink: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  paper: '#ffffff',
} as const;

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

const UNPRINTABLE_SYMBOLS = new RegExp(`[${Object.keys(UNPRINTABLE_CURRENCY).join('')}]`, 'g');

/**
 * Text that was formatted somewhere else — a dashboard value, an AI summary —
 * with any currency symbol the built-in fonts cannot draw swapped for its
 * code. For text the generator formats itself, prefix with `pdfCurrency`.
 */
export const pdfSafeText = (text: string): string =>
  text.replace(UNPRINTABLE_SYMBOLS, (symbol) => UNPRINTABLE_CURRENCY[symbol] ?? symbol);

/** The currencies a document can name in words, keyed by the admin's symbol. */
const CURRENCY_NAMES: Record<string, string> = {
  '₹': 'Indian Rupees (INR)',
  INR: 'Indian Rupees (INR)',
};

/**
 * The line that says which currency every amount on a document is in, or null
 * for a symbol it cannot name — a guess on a financial document is worse than
 * no line. Printed on the invoices because the amounts carry the ISO code
 * (see `pdfCurrency`) rather than the ₹ glyph, and a bare "INR 23.00" column
 * should not leave a reader to infer it.
 */
export const pdfCurrencyNote = (symbol: string): string | null => {
  const name = CURRENCY_NAMES[symbol.trim()];
  return name ? `All amounts are in ${name}.` : null;
};

/**
 * How tall a table row has to be: its tallest cell, as drawn.
 *
 * A row that advances by one line while its description wraps onto a second
 * draws that second line across the divider and into the next row. Measured
 * with the font and size the row is drawn in, so set those first.
 */
export function pdfRowHeight(
  doc: PDFKit.PDFDocument,
  cells: ReadonlyArray<{ text: string; width: number }>
): number {
  return Math.max(0, ...cells.map((cell) => doc.heightOfString(cell.text, { width: cell.width })));
}

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
