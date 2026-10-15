import { PDF_PALETTE, pdfCurrency, pdfCurrencyNote, pdfRowHeight, renderPdf } from '@services/pdf/document';
import { appDateTime } from '@utils/app-time';

/**
 * The invoice for a venue food order.
 *
 * It is the VENUE's bill, not Duncit's: the guest paid the venue's own account,
 * so the venue's name, address and GST number head the page and Duncit appears
 * only as the place the order was made. With a GST percent on the order it
 * shows the taxable value and the CGST / SGST halves, and is titled a TAX
 * INVOICE when the venue also gave its GSTIN. An order placed before GST
 * existed (0%) prints as it always did: prices inclusive of all taxes.
 */
export interface FoodInvoiceLine {
  name: string;
  quantity: number;
  unit: number;
  total: number;
}

export interface FoodInvoiceData {
  invoice_no: string;
  issued_at: Date;
  venue_name: string;
  venue_address: string;
  venue_gstin: string;
  /** The venue's FSSAI licence number as it was when the order was placed; blank prints nothing. */
  venue_fssai?: string;
  customer_name: string;
  customer_phone: string;
  table_label: string;
  currency_symbol: string;
  lines: FoodInvoiceLine[];
  subtotal: number;
  discount_pct: number;
  discount: number;
  coupon_code: string;
  coupon_discount: number;
  /** How the GST met the price, and at what percent; 0 prints no GST lines. */
  tax_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  gst_pct: number;
  /** The value the GST is charged on, and its two halves (they add up to the tax exactly). */
  taxable: number;
  cgst: number;
  sgst: number;
  total: number;
  payment_reference: string;
  /** Printed under the total when the money has gone, or is going, back. */
  refund_note: string;
}

type Doc = PDFKit.PDFDocument;

const LEFT = 48;
const HEADER_HEIGHT = 96;
/** Below this a row would run into the footer, so the table continues on a new page. */
const PAGE_BOTTOM = 770;
/** The table's cells sit this far inside its edges, so the last column never touches the band's end. */
const CELL_INSET = 6;
/** Room the totals, the GST lines and the notes need below the last item. */
const TOTALS_HEIGHT = 224;
const COLUMNS = { name: LEFT + CELL_INSET, quantity: 324, unit: 374, total: 464 } as const;
const { accent, accentSoft, ink, muted, line, paper } = PDF_PALETTE;

/** A TAX INVOICE needs both a GST number and a GST charged; anything less is a plain invoice. */
export const invoiceTitle = (data: Pick<FoodInvoiceData, 'venue_gstin' | 'gst_pct'>) =>
  data.venue_gstin && data.gst_pct > 0 ? 'TAX INVOICE' : 'INVOICE';

/** The line under the totals that says how the prices meet the GST. */
export const taxNote = (data: Pick<FoodInvoiceData, 'tax_mode' | 'gst_pct'>) => {
  if (data.gst_pct <= 0) return 'Prices are inclusive of all applicable taxes.';
  return data.tax_mode === 'EXCLUSIVE' ? 'GST added to prices.' : 'Prices include GST.';
};

function drawHeader(doc: Doc, data: FoodInvoiceData, right: number): number {
  doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(accent);
  doc.fillColor(paper).fontSize(22).font('Helvetica-Bold').text(data.venue_name, LEFT, 34, {
    width: right - LEFT - 150,
    height: 30,
    ellipsis: true,
  });
  doc.fillColor(paper).fontSize(18).font('Helvetica-Bold').text(invoiceTitle(data), LEFT, 38, { width: right - LEFT, align: 'right' });

  const top = HEADER_HEIGHT + 20;
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(data.venue_name, LEFT, top, { width: 280 });
  doc.fillColor(muted).fontSize(9).font('Helvetica');
  if (data.venue_address) doc.text(data.venue_address, LEFT, doc.y + 2, { width: 280 });
  if (data.venue_gstin) doc.text(`GSTIN: ${data.venue_gstin}`, LEFT, doc.y + 2);
  if (data.venue_fssai) doc.text(`FSSAI Lic. No: ${data.venue_fssai}`, LEFT, doc.y + 2);
  const leftBottom = doc.y;

  doc.fillColor(muted).fontSize(9).text('Invoice No', 360, top, { width: right - 360, align: 'right' });
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(data.invoice_no, 360, doc.y, { width: right - 360, align: 'right' });
  doc
    .fillColor(muted)
    .fontSize(9)
    .font('Helvetica')
    .text(`Date: ${appDateTime(data.issued_at)}`, 360, doc.y + 4, { width: right - 360, align: 'right' });
  return Math.max(leftBottom, doc.y) + 16;
}

function drawBilledTo(doc: Doc, data: FoodInvoiceData, right: number, top: number): number {
  const height = 60;
  doc.roundedRect(LEFT, top, right - LEFT, height, 10).fill(accentSoft);
  doc.fillColor(accent).fontSize(8.5).font('Helvetica-Bold').text('BILLED TO', LEFT + 14, top + 12);
  doc.fillColor(ink).fontSize(11).font('Helvetica-Bold').text(data.customer_name, LEFT + 14, top + 24, {
    width: right - LEFT - 28,
    height: 14,
    ellipsis: true,
  });
  const contact = [data.customer_phone, data.table_label ? `Table ${data.table_label}` : ''].filter(Boolean).join('  ·  ');
  doc.fillColor(muted).fontSize(9).font('Helvetica').text(contact, LEFT + 14, top + 40, { width: right - LEFT - 28 });
  return top + height + 22;
}

function drawTableHead(doc: Doc, right: number, top: number): number {
  doc.rect(LEFT, top - 6, right - LEFT, 24).fill(accent);
  doc.fillColor(paper).fontSize(8.5).font('Helvetica-Bold');
  doc
    .text('ITEM', COLUMNS.name, top, { width: 260 })
    .text('QTY', COLUMNS.quantity, top, { width: 40, align: 'right' })
    .text('RATE', COLUMNS.unit, top, { width: 80, align: 'right' })
    .text('AMOUNT', COLUMNS.total, top, { width: right - CELL_INSET - COLUMNS.total, align: 'right' });
  return top + 26;
}

/** The invoice as PDF bytes. */
export function renderVenueFoodInvoice(data: FoodInvoiceData): Promise<Buffer> {
  return renderPdf((doc) => {
    const right = doc.page.width - LEFT;
    const currency = pdfCurrency(data.currency_symbol);
    const money = (amount: number) => `${currency}${amount.toFixed(2)}`;

    let y = drawTableHead(doc, right, drawBilledTo(doc, data, right, drawHeader(doc, data, right)));
    for (const item of data.lines) {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        y = drawTableHead(doc, right, LEFT + 6);
      }
      doc.fillColor(ink).fontSize(9.5).font('Helvetica');
      const amountWidth = right - CELL_INSET - COLUMNS.total;
      doc
        .text(item.name, COLUMNS.name, y, { width: 260 })
        .text(String(item.quantity), COLUMNS.quantity, y, { width: 40, align: 'right' })
        .text(money(item.unit), COLUMNS.unit, y, { width: 80, align: 'right' })
        .text(money(item.total), COLUMNS.total, y, { width: amountWidth, align: 'right' });
      // `doc.y` is where the LAST cell (the amount) ended, not the item name —
      // a name that wrapped ran into the divider. The tallest cell sets the row.
      const rowHeight = pdfRowHeight(doc, [
        { text: item.name, width: 260 },
        { text: money(item.unit), width: 80 },
        { text: money(item.total), width: amountWidth },
      ]);
      y = Math.max(y + rowHeight, y + 12) + 8;
      doc.moveTo(LEFT, y - 2).lineTo(right, y - 2).strokeColor(line).stroke();
    }

    // The totals, the payment line and the notes stay together on one page.
    if (y > PAGE_BOTTOM - TOTALS_HEIGHT) {
      doc.addPage();
      y = LEFT;
    }
    y += 10;
    const row = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 12 : 10)
        .fillColor(bold ? ink : muted)
        .text(label, 250, y, { width: 200, align: 'right' })
        .fillColor(bold ? accent : ink)
        .text(value, 450, y, { width: right - CELL_INSET - 450, align: 'right' });
      y += bold ? 22 : 17;
    };
    row('Subtotal', money(data.subtotal));
    if (data.discount > 0) row(`QR order discount (${data.discount_pct}%)`, `- ${money(data.discount)}`);
    if (data.coupon_discount > 0) row(`Coupon ${data.coupon_code}`, `- ${money(data.coupon_discount)}`);
    if (data.gst_pct > 0) {
      const half = `${data.gst_pct / 2}%`;
      doc.moveTo(300, y).lineTo(right, y).strokeColor(line).stroke();
      y += 8;
      row('Taxable value', money(data.taxable));
      row(`CGST (${half})`, money(data.cgst));
      row(`SGST (${half})`, money(data.sgst));
    }
    doc.moveTo(300, y).lineTo(right, y).strokeColor(line).stroke();
    y += 8;
    row('Total paid', money(data.total), true);

    y += 10;
    doc.fillColor(muted).fontSize(9).font('Helvetica');
    doc.text(taxNote(data), LEFT, y, { width: right - LEFT });
    const currencyNote = pdfCurrencyNote(data.currency_symbol);
    if (currencyNote) doc.text(currencyNote, LEFT, doc.y + 3, { width: right - LEFT });
    if (data.payment_reference) doc.text(`Paid online · Payment reference: ${data.payment_reference}`, LEFT, doc.y + 3);
    if (data.refund_note) doc.fillColor(ink).font('Helvetica-Bold').text(data.refund_note, LEFT, doc.y + 6);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(muted)
      .text(
        `Issued by ${data.venue_name}. Ordered on Duncit. This is a computer-generated invoice and does not require a signature.`,
        LEFT,
        doc.y + 16,
        { align: 'center', width: right - LEFT }
      );
  });
}
