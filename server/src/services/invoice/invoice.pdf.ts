import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { appDate } from '@utils/app-time';
import { pdfCurrency, pdfCurrencyNote, pdfRowHeight } from '@services/pdf/document';

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface InvoiceData {
  invoice_no: string;
  invoice_date: Date;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  // Billing email when it differs from the main contact email — both print.
  customer_billing_email?: string;
  // Buyer's billing GSTIN (B2B) + pre-composed address lines for the bill-to
  // block. Both optional — the block collapses to name + contact when absent.
  customer_gstin?: string;
  customer_address_lines?: string[];
  business_name: string;
  business_address: string;
  business_gstin: string;
  currency_symbol: string;
  items: InvoiceLineItem[];
  subtotal: number;
  gst_amount: number;
  gst_pct: number;
  // What rounding the bill up to a whole rupee added to the charge. Its own row,
  // after the tax lines: it is not taxable value, and without it the rows above
  // would not add up to the total. Optional so older callers keep working; zero
  // prints nothing.
  round_off?: number;
  total: number;
  payment_id: string;
  payment_method: string;
  // Duncit Coins on this order. Both halves print: what the buyer spent comes
  // OFF the total (it is why Total Paid is lower than the line items), and what
  // they earned is a reward the invoice is the natural record of. Optional so
  // callers that predate coins keep working; zero prints nothing.
  coins_redeemed?: number;
  coins_earned?: number;
  // The pod's multi-ticket discount, frozen on the payment. The line items are
  // already priced net of it, so the row states why they sit below list price.
  // Optional like the coins; a zero amount prints nothing.
  ticket_discount_pct?: number;
  ticket_discount_amount?: number;
  /** Tickets the discount covered — the booking's seats. */
  ticket_discount_tickets?: number;
  // Dynamic branding pulled from Finance → Invoice Management. All optional so
  // older callers keep working; the generator renders only what is provided.
  invoice_label?: string;
  invoice_support_email?: string;
  invoice_support_phone?: string;
  invoice_footer_note?: string;
  invoice_terms?: string;
  invoice_logo_url?: string;
}

// Duncit brand palette — kept in lock-step with the ticket PDF + app theme.
const ACCENT = '#F82D2F';
const ACCENT_SOFT = '#fff1f1';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
// Inner padding of a table cell, and where the money column (and the totals
// under it) starts.
const CELL_PAD = 8;
const VALUE_X = 456;

// Bundled white brand mark embedded on the header band (loaded once).
const BRAND_MARK_PATH = path.resolve(__dirname, '../_assets/duncit-mark-white.png');
const BRAND_MARK: Buffer | null = (() => {
  try {
    return fs.readFileSync(BRAND_MARK_PATH);
  } catch {
    return null;
  }
})();

/** Best-effort fetch of a remote logo into a Buffer pdfkit can embed. Returns
 * null when no URL is set or the fetch/format fails — the wordmark is used then. */
async function loadLogo(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Bill-To card (name · GSTIN · contact + billing email · address) drawn at `y`.
 * Returns the card height so the caller can advance its cursor. */
function drawBillToCard(doc: PDFKit.PDFDocument, data: InvoiceData, L: number, R: number, y: number): number {
  const contact = [data.customer_email, data.customer_phone].filter(Boolean).join('  ·  ');
  const addressLines = (data.customer_address_lines ?? []).map((s) => s.trim()).filter(Boolean);
  const billingEmailRow = data.customer_billing_email ? 1 : 0;
  // Height grows with the optional GSTIN + billing email + address lines.
  const extraRows = (data.customer_gstin ? 1 : 0) + billingEmailRow + addressLines.length;
  const cardH = 52 + extraRows * 13;
  doc.roundedRect(L, y, R - L, cardH, 10).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text('BILL TO', L + 14, y + 12);
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.customer_name, L + 14, y + 24);
  let by = y + 40;
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  if (contact) {
    doc.text(contact, L + 14, by, { width: R - L - 28 });
    by += 13;
  }
  if (data.customer_billing_email) {
    doc.text(`Billing email: ${data.customer_billing_email}`, L + 14, by, { width: R - L - 28 });
    by += 13;
  }
  if (data.customer_gstin) {
    doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(`GSTIN: ${data.customer_gstin}`, L + 14, by);
    doc.fillColor(MUTED).font('Helvetica');
    by += 13;
  }
  for (const line of addressLines) {
    doc.text(line, L + 14, by, { width: R - L - 28 });
    by += 13;
  }
  return cardH;
}

/** The multi-ticket discount's totals row, or null when the payment had none. */
function ticketDiscountRow(
  data: InvoiceData,
  fmt: (n: number) => string
): { label: string; value: string } | null {
  const amount = Math.max(0, Number(data.ticket_discount_amount) || 0);
  if (amount <= 0) return null;
  const pct = Number(data.ticket_discount_pct) || 0;
  const tickets = Number(data.ticket_discount_tickets) || 0;
  return { label: `Multi-ticket discount (${pct}% on ${tickets} tickets)`, value: `- ${fmt(amount)}` };
}

/** The brand header band across the top of the page: logo mark, business name and the invoice label. */
function drawBrandHeader(doc: PDFKit.PDFDocument, data: InvoiceData, logo: Buffer | null, L: number, R: number): void {
  doc.rect(0, 0, doc.page.width, 96).fill(ACCENT);
  let brandX = L;
  // Prefer the admin-configured logo; otherwise fall back to the bundled
  // white brand mark so the invoice always carries the Duncit logo.
  const headerLogo = logo ?? BRAND_MARK;
  if (headerLogo) {
    try {
      doc.image(headerLogo, L, 26, { fit: [44, 44], valign: 'center' });
      brandX = L + 54;
    } catch {
      brandX = L;
    }
  }
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(data.business_name, brandX, 36);
  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(data.invoice_label || 'TAX INVOICE', L, 36, { width: R - L, align: 'right' });
}

/** The invoice page. Exported so a combined document can add a page of the
 * right size before the invoice is drawn onto it. */
export const INVOICE_PAGE = { size: 'A4' as const, margin: 0 };

/** The logo fetch is the only asynchronous part; resolve it before drawing. */
export const invoiceLogo = (url?: string) => loadLogo(url);

/**
 * Draw the invoice onto the CURRENT page of a document.
 *
 * Split out from the single-file export so an event ticket can carry this
 * exact invoice as its second page. One renderer, so the emailed invoice and
 * the one stapled to a ticket can never say different things.
 */
export function drawInvoice(
 doc: PDFKit.PDFDocument,
 data: InvoiceData,
 logo: Buffer | null
): void {
  const W = doc.page.width;
  const L = 48; // left margin
  const R = W - 48; // right edge
  // Helvetica has no ₹ glyph (it printed as a stray "¹"); pdfCurrency swaps
  // it for the ISO code, and the note under the totals says so in words.
  const cur = pdfCurrency(data.currency_symbol);
  const fmt = (n: number) => `${cur}${n.toFixed(2)}`;

  drawBrandHeader(doc, data, logo, L, R);

  // ---- Business + invoice meta row ----
  let y = 116;
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.business_name, L, y);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  if (data.business_address) doc.text(data.business_address, L, doc.y + 2, { width: 260 });
  if (data.business_gstin) doc.text(`GSTIN: ${data.business_gstin}`, L, doc.y + 2);

  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica')
    .text(`Invoice No`, 360, y, { width: R - 360, align: 'right' });
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.invoice_no, 360, doc.y, { width: R - 360, align: 'right' });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica')
    .text(`Date: ${appDate(data.invoice_date)}`, 360, doc.y + 4, { width: R - 360, align: 'right' })
    .text(`Payment ID: ${data.payment_id}`, 360, doc.y + 2, { width: R - 360, align: 'right' });

  // ---- Bill To card (name · GSTIN · contact + billing email · address) ----
  y = Math.max(doc.y, y + 64) + 14;
  const cardH = drawBillToCard(doc, data, L, R, y);

  // ---- Items table ----
  y = drawItemsTable(doc, data.items, fmt, L, R, y + cardH + 22);

  // ---- Totals ----
  y += 10;
  const totalsRow = (label: string, value: string, bold = false) => {
    // The label box starts at the left margin but still ends at 450, right
    // aligned, so short labels sit where they always did and a long one (the
    // multi-ticket discount) fits on one line instead of wrapping into the next.
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 12 : 10)
      .fillColor(bold ? INK : MUTED)
      .text(label, L, y, { width: 450 - L, align: 'right' })
      .fillColor(bold ? ACCENT : INK)
      // Same right edge as the AMOUNT column, so totals line up under it.
      .text(value, VALUE_X, y, { width: R - CELL_PAD - VALUE_X, align: 'right' });
    y += bold ? 22 : 17;
  };
  // Above the tax lines on purpose: the discount came off the ticket price
  // before GST was worked out, so the block reads discount → taxable → GST → paid.
  const discountRow = ticketDiscountRow(data, fmt);
  if (discountRow) totalsRow(discountRow.label, discountRow.value);
  totalsRow('Taxable value', fmt(data.subtotal));
  totalsRow(`GST (${data.gst_pct}%)`, fmt(data.gst_amount));
  // After the taxes, before the total: taxable + GST + round off = total paid.
  const roundOff = Math.max(0, Number(data.round_off) || 0);
  if (roundOff > 0) totalsRow('Round off', `+ ${fmt(roundOff)}`);
  doc.moveTo(300, y).lineTo(R, y).strokeColor('#cbd5e1').stroke();
  y += 8;
  totalsRow('Total Paid', fmt(data.total), true);

  // ---- Duncit Coins ----
  // Below the paid total on purpose: coins are not money the tax lines
  // describe. The redeemed row explains a total smaller than the items, and
  // the earned row records a reward that otherwise lives only in the app.
  const coinsSpent = Math.max(0, Math.floor(Number(data.coins_redeemed) || 0));
  const coinsEarned = Math.max(0, Math.floor(Number(data.coins_earned) || 0));
  if (coinsSpent > 0 || coinsEarned > 0) {
    y += 2;
    if (coinsSpent > 0) totalsRow('Duncit Coins used', `- ${coinsSpent}`);
    if (coinsEarned > 0) totalsRow('Duncit Coins earned', `+ ${coinsEarned}`);
  }

  drawFooter(doc, data, L, R, y + 18);
}

/**
 * The line items: a header band, then one row per item. Returns the cursor
 * below the last row.
 *
 * Every column keeps CELL_PAD inside the header band on both sides — AMOUNT
 * used to end flush on the band's right edge and read as clipped. Each row is
 * as tall as its tallest cell, so a description that wraps pushes the divider
 * and the next row down instead of running into them.
 */
function drawItemsTable(
  doc: PDFKit.PDFDocument,
  items: readonly InvoiceLineItem[],
  fmt: (n: number) => string,
  L: number,
  R: number,
  top: number
): number {
  let y = top;
  const cols = {
    desc: { x: L + CELL_PAD, w: 252 },
    qty: { x: 312, w: 40 },
    price: { x: 360, w: 88 },
    amount: { x: VALUE_X, w: R - CELL_PAD - VALUE_X },
  };
  doc.rect(L, y - 6, R - L, 24).fill(ACCENT);
  doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold');
  doc
    .text('DESCRIPTION', cols.desc.x, y, { width: cols.desc.w })
    .text('QTY', cols.qty.x, y, { width: cols.qty.w, align: 'right' })
    .text('PRICE', cols.price.x, y, { width: cols.price.w, align: 'right' })
    .text('AMOUNT', cols.amount.x, y, { width: cols.amount.w, align: 'right' });

  y += 26;
  doc.fillColor(INK).fontSize(10).font('Helvetica');
  for (const it of items) {
    const cells = [
      { text: it.description, ...cols.desc, align: 'left' as const },
      { text: String(it.qty), ...cols.qty, align: 'right' as const },
      { text: fmt(it.unit_price), ...cols.price, align: 'right' as const },
      { text: fmt(it.amount), ...cols.amount, align: 'right' as const },
    ];
    for (const cell of cells) doc.text(cell.text, cell.x, y, { width: cell.w, align: cell.align });
    y += pdfRowHeight(doc, cells.map((cell) => ({ text: cell.text, width: cell.w }))) + 8;
    doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor(LINE).stroke();
  }
  return y;
}

/** Currency note, payment method, support contacts, terms and the closing line. */
function drawFooter(doc: PDFKit.PDFDocument, data: InvoiceData, L: number, R: number, top: number): void {
  let y = top;
  const currencyNote = pdfCurrencyNote(data.currency_symbol);
  if (currencyNote) {
    doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(currencyNote, L, y);
    y = doc.y + 4;
  }
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Payment method: ${data.payment_method}`, L, y);
  const support = [
    data.invoice_support_email ? `Email: ${data.invoice_support_email}` : '',
    data.invoice_support_phone ? `Phone: ${data.invoice_support_phone}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  if (support) doc.fillColor(MUTED).fontSize(9).text(support, L, doc.y + 4);
  if (data.invoice_terms) {
    doc.fillColor(INK).fontSize(8.5).font('Helvetica-Bold').text('Terms', L, doc.y + 12);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(data.invoice_terms, L, doc.y + 2, { width: R - L });
  }
  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .text(
      data.invoice_footer_note || 'This is a computer-generated invoice and does not require a signature.',
      L,
      doc.y + 14,
      { align: 'center', width: R - L }
    );
}

/** Renders a standalone invoice PDF. */
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const logo = await invoiceLogo(data.invoice_logo_url);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument(INVOICE_PAGE);
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      drawInvoice(doc, data, logo);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
