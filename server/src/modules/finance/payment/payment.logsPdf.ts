import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import {
  PDF_PALETTE,
  drawPdfFooters,
  loadPdfImage,
  pdfCurrency,
  pdfCurrencyNote,
  pdfRowHeight,
  pdfSafeText,
  renderPdf,
} from '@services/pdf/document';
import { appDateTime, getAppTimeZone } from '@utils/app-time';
import type { TableQueryInput } from '@utils/table-query';
import { paymentService } from './payment.service';
import type { PaymentShop } from './payment.source';
import {
  PAYMENT_LOGS_PDF_MAX_ROWS,
  capLine,
  describeQuery,
  paymentRefundWord,
  paymentStatusWord,
  totalsOf,
  type PaymentLogRow,
} from './payment.logsPdf.words';

/**
 * The Payment Logs table as a PDF: the same rows the table shows for the same
 * search, filters and sort, in plain words, to print or send on.
 *
 * Landscape, because a payment row carries seven things and the Razorpay id
 * alone needs a column of its own. Pages are buffered so the footer can say
 * "Page x of y", and the table header is drawn again on every page. Totals are
 * worked out over the rows printed (not the whole filter), which is why a cut
 * list says so in words both at the top and under the table.
 *
 * The business name, logo and support contacts are the ones Finance › Invoice
 * Management holds — the source every other PDF prints from.
 */

const PAGE_SIZE = 100;
const SIDE = 36;
const BAND = 64;
const FOOTER_ZONE = 44;
const HEADER_ROW = 20;
const CELL_PAD = 4;
const { accent, accentSoft, ink, muted, line, paper, stripe } = PDF_PALETTE;

export interface PaymentLogsBranding {
  business_name: string;
  logo_url: string;
  support_email: string;
  support_phone: string;
}

export interface PaymentLogsPdfData {
  title: string;
  rows: PaymentLogRow[];
  /** Payments the filter matches in all — more than `rows` when the list was cut. */
  total: number;
  filters: string;
  generated_at: Date;
}

/** The heading each log prints under: the shop's own name, never a shared one. */
export const paymentLogsTitle = (shop?: PaymentShop | null): string => {
  if (shop === 'POD_SHOP') return 'Pod Shop Payment Logs';
  if (shop === 'ECOMM') return 'Ecomm Payment Logs';
  return 'Payment Logs';
};

/**
 * Every row the table would show for this query, a page at a time, up to the
 * cap. It asks the table's own reads (so search, filters, sort and the shop's
 * fixed scope behave exactly as on screen) and stops on an empty page.
 */
export async function fetchPaymentLogRows(
  query: TableQueryInput | null | undefined,
  shop: PaymentShop | null | undefined
): Promise<{ rows: PaymentLogRow[]; total: number }> {
  const rows: PaymentLogRow[] = [];
  let total = 0;
  for (let page = 1; rows.length < PAYMENT_LOGS_PDF_MAX_ROWS; page += 1) {
    const input = { ...query, page, page_size: PAGE_SIZE };
    const result = shop ? await paymentService.tableForShop(shop, input) : await paymentService.table(input);
    total = result.total;
    if (result.rows.length === 0) break;
    rows.push(...result.rows);
    if (rows.length >= total) break;
  }
  return { rows: rows.slice(0, PAYMENT_LOGS_PDF_MAX_ROWS), total };
}

interface Column {
  x: number;
  width: number;
}

interface Columns {
  when: Column;
  customer: Column;
  what: Column;
  amount: Column;
  status: Column;
  refund: Column;
  razorpay: Column;
}

/** Column boxes across the printable width, in the order they are read. */
function columnsFor(left: number): Columns {
  const widths = [78, 150, 170, 76, 56, 98, 142];
  const [when, customer, what, amount, status, refund, razorpay] = widths.map((width, index) => ({
    x: left + widths.slice(0, index).reduce((sum, w) => sum + w, 0) + CELL_PAD,
    width: width - CELL_PAD * 2,
  }));
  return { when, customer, what, amount, status, refund, razorpay };
}

interface Page {
  doc: PDFKit.PDFDocument;
  left: number;
  right: number;
  bottom: number;
  columns: Columns;
  title: string;
}

function drawBrandBand(page: Page, branding: PaymentLogsBranding, logo: Buffer | null): void {
  const { doc, left, right } = page;
  doc.rect(0, 0, doc.page.width, BAND).fill(accent);
  let drewLogo = false;
  if (logo) {
    try {
      doc.image(logo, left, 14, { fit: [140, 36], valign: 'center' });
      drewLogo = true;
    } catch {
      // A logo pdfkit cannot decode falls back to the business name below.
      drewLogo = false;
    }
  }
  if (!drewLogo) {
    doc.fillColor(paper).fontSize(18).font('Helvetica-Bold').text(pdfSafeText(branding.business_name), left, 22, { lineBreak: false });
  }
  doc
    .fillColor(paper)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(page.title.toUpperCase(), left, 24, { width: right - left, align: 'right', lineBreak: false });
}

/** Who made this and what it covers: generated-at, the filters, the count and any cut. Returns the y below. */
function drawMeta(page: Page, data: PaymentLogsPdfData): number {
  const { doc, left, right } = page;
  const width = right - left;
  let y = BAND + 14;
  doc.fillColor(muted).fontSize(8.5).font('Helvetica');
  doc.text(`Generated: ${appDateTime(data.generated_at)}  ·  Time zone: ${getAppTimeZone()}`, left, y, { width });
  y = doc.y + 3;
  doc.text(`Search and filters: ${pdfSafeText(data.filters)}`, left, y, { width });
  y = doc.y + 3;
  doc.text(`Payments listed: ${data.rows.length} of ${data.total}`, left, y, { width });
  y = doc.y + 3;
  const note = data.rows.length > 0 ? pdfCurrencyNote(data.rows[0].currency_symbol) : null;
  if (note) {
    doc.text(note, left, y, { width });
    y = doc.y + 3;
  }
  const cut = capLine(data.rows.length, data.total);
  if (cut) {
    doc.fillColor(accent).font('Helvetica-Bold').text(cut, left, y, { width });
    y = doc.y + 3;
  }
  return y + 8;
}

function drawTableHeader(page: Page, y: number): number {
  const { doc, left, right, columns } = page;
  doc.rect(left, y, right - left, HEADER_ROW).fill(accent);
  doc.fillColor(paper).fontSize(8).font('Helvetica-Bold');
  const textY = y + 7;
  const heads: [Column, string, 'left' | 'right'][] = [
    [columns.when, 'DATE', 'left'],
    [columns.customer, 'CUSTOMER', 'left'],
    [columns.what, 'WHAT FOR', 'left'],
    [columns.amount, 'AMOUNT', 'right'],
    [columns.status, 'STATUS', 'left'],
    [columns.refund, 'REFUND', 'left'],
    [columns.razorpay, 'RAZORPAY PAYMENT', 'left'],
  ];
  for (const [column, label, align] of heads) {
    doc.text(label, column.x, textY, { width: column.width, align, lineBreak: false });
  }
  return y + HEADER_ROW + 4;
}

/** A new page for the table to run onto: a one-line reminder of what it is, then the header again. */
function continueOnNewPage(page: Page): number {
  const { doc, left, right } = page;
  doc.addPage();
  doc.fillColor(muted).fontSize(8).font('Helvetica').text(`${page.title} (continued)`, left, 20, { width: right - left, lineBreak: false });
  return drawTableHeader(page, 34);
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

/** What one row prints in each column, as plain text. Pure, for tests. */
export function printableRow(row: PaymentLogRow) {
  return {
    when: appDateTime(row.created_at),
    customer: pdfSafeText([row.user_name, row.user_email].filter(Boolean).join('\n')),
    what: pdfSafeText(clip(row.description ?? '', 140)),
    amount: `${pdfCurrency(row.currency_symbol)}${row.total.toFixed(2)}`,
    status: paymentStatusWord(row.status),
    refund: paymentRefundWord(row) || '-',
    razorpay: row.razorpay_payment_id || '-',
  };
}

function rowHeight(page: Page, row: ReturnType<typeof printableRow>): number {
  const { doc, columns } = page;
  doc.fontSize(8).font('Helvetica');
  const tallest = pdfRowHeight(doc, [
    { text: row.when, width: columns.when.width },
    { text: row.customer, width: columns.customer.width },
    { text: row.what, width: columns.what.width },
    { text: row.refund, width: columns.refund.width },
    { text: row.razorpay, width: columns.razorpay.width },
  ]);
  return Math.max(tallest, 12) + 10;
}

function drawRow(page: Page, row: ReturnType<typeof printableRow>, y: number, height: number, striped: boolean): void {
  const { doc, left, right, columns } = page;
  if (striped) doc.rect(left, y - 4, right - left, height).fill(stripe);
  doc.fillColor(ink).fontSize(8).font('Helvetica');
  doc.text(row.when, columns.when.x, y, { width: columns.when.width });
  doc.text(row.customer, columns.customer.x, y, { width: columns.customer.width });
  doc.text(row.what, columns.what.x, y, { width: columns.what.width });
  doc.font('Helvetica-Bold').text(row.amount, columns.amount.x, y, { width: columns.amount.width, align: 'right' });
  doc.font('Helvetica').text(row.status, columns.status.x, y, { width: columns.status.width });
  doc.text(row.refund, columns.refund.x, y, { width: columns.refund.width });
  doc.text(row.razorpay, columns.razorpay.x, y, { width: columns.razorpay.width });
  doc
    .moveTo(left, y + height - 5)
    .lineTo(right, y + height - 5)
    .strokeColor(line)
    .stroke();
}

function drawRows(page: Page, data: PaymentLogsPdfData, startY: number): number {
  const { doc, left, right } = page;
  if (data.rows.length === 0) {
    doc.fillColor(muted).fontSize(10).font('Helvetica').text('No payments match these filters.', left, startY + 8, { width: right - left, align: 'center' });
    return startY + 34;
  }
  let y = startY;
  data.rows.forEach((source, index) => {
    const row = printableRow(source);
    const height = rowHeight(page, row);
    if (y + height > page.bottom) y = continueOnNewPage(page);
    drawRow(page, row, y, height, index % 2 === 1);
    y += height;
  });
  return y;
}

/** The totals block, kept whole: it moves to a fresh page rather than splitting across two. */
function drawTotals(page: Page, data: PaymentLogsPdfData, startY: number): void {
  const { doc, left, right } = page;
  const totals = totalsOf(data.rows);
  const cut = capLine(data.rows.length, data.total);
  const needed = totals.length * 34 + (cut ? 24 : 0) + 40;
  let y = startY + 12;
  if (y + needed > page.bottom) {
    doc.addPage();
    y = 40;
  }
  doc.roundedRect(left, y, right - left, needed - 12, 8).fill(accentSoft);
  doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text(`TOTALS FOR THE ${data.rows.length} PAYMENTS LISTED`, left + 12, y + 10, { lineBreak: false });
  let lineY = y + 26;
  for (const entry of totals) {
    const symbol = pdfCurrency(entry.symbol);
    doc
      .fillColor(ink)
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Paid: ${entry.paid_count} payments, ${symbol}${entry.paid.toFixed(2)}   ·   Refunded: ${entry.refunded_count} payments, ${symbol}${entry.refunded.toFixed(2)}   ·   Failed: ${entry.failed_count}   ·   Pending: ${entry.pending_count}`,
        left + 12,
        lineY,
        { width: right - left - 24 }
      );
    lineY += 14;
  }
  if (cut) doc.fillColor(accent).font('Helvetica-Bold').text(cut, left + 12, lineY + 2, { width: right - left - 24 });
}

/** Written last, once every page exists, so each one can state the total. */
function drawFooters(page: Page, branding: PaymentLogsBranding, generatedAt: Date): void {
  const { doc, left, right } = page;
  drawPdfFooters(doc, {
    left,
    right,
    zone: FOOTER_ZONE,
    note: `${pdfSafeText(branding.business_name)}  ·  Payment Logs  ·  ${appDateTime(generatedAt)}`,
    support: [branding.support_email, branding.support_phone].filter(Boolean).join('   ·   '),
  });
}

/** Draw the document from rows already fetched. `options` lets a test ask for an uncompressed file. */
export async function renderPaymentLogsPdf(
  data: PaymentLogsPdfData,
  branding: PaymentLogsBranding,
  options: PDFKit.PDFDocumentOptions = {}
): Promise<Buffer> {
  const logo = await loadPdfImage(branding.logo_url);
  return renderPdf(
    (doc) => {
      const left = SIDE;
      const page: Page = {
        doc,
        left,
        right: doc.page.width - SIDE,
        bottom: doc.page.height - FOOTER_ZONE,
        columns: columnsFor(left),
        title: data.title,
      };
      drawBrandBand(page, branding, logo);
      const tableTop = drawTableHeader(page, drawMeta(page, data));
      const rowsBottom = drawRows(page, data, tableTop);
      drawTotals(page, data, rowsBottom);
      drawFooters(page, branding, data.generated_at);
    },
    { layout: 'landscape', bufferPages: true, ...options }
  );
}

/**
 * The Payment Logs PDF for a table query, as base64 for the GraphQL answer.
 * The caller (the resolver) has already checked the same read roles the table
 * itself needs; this only reads what the table reads.
 */
export async function paymentLogsPdf(args: { query?: TableQueryInput | null; shop?: PaymentShop | null }): Promise<string> {
  const [{ rows, total }, settings] = await Promise.all([
    fetchPaymentLogRows(args.query, args.shop),
    getFinanceSettings(),
  ]);
  const pdf = await renderPaymentLogsPdf(
    {
      title: paymentLogsTitle(args.shop),
      rows,
      total,
      filters: describeQuery(args.query),
      generated_at: new Date(),
    },
    {
      business_name: settings.business_name,
      logo_url: settings.invoice_logo_url,
      support_email: settings.invoice_support_email,
      support_phone: settings.invoice_support_phone,
    }
  );
  return pdf.toString('base64');
}
