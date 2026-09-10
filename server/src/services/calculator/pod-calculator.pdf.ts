import { loadPdfImage, pdfCurrency, renderPdf } from '@services/pdf/document';
import type { PodCalculatorLine, PodCalculatorTotals } from '@modules/finance/podCalculator/podCalculator.totals';
import { appDateTime } from '@utils/app-time';

export interface PodCalculatorReportData {
  name: string;
  /** SINGLE or MULTI — printed so the reader knows which tab produced it. */
  kind_label: string;
  generated_at: Date;
  currency_symbol: string;
  business_name: string;
  lines: readonly PodCalculatorLine[];
  totals: PodCalculatorTotals;
  invoice_logo_url?: string;
}

// Duncit brand palette — kept in lock-step with the invoice, payout and ticket PDFs.
const ACCENT = '#ff4f73';
const ACCENT_SOFT = '#fff1f4';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

const L = 40;

/** Padding inside the row band, before the pod name. */
const PAD = 6;

/**
 * The money columns, widest first in importance, right-aligned.
 *
 * Widths only — the x offsets are computed from the page in `layoutOf`, so the
 * last column ends exactly on the right margin. Hard-coded offsets are what put
 * DUNCIT at x=544 with a width of 54 on a 595pt page: three points past the
 * paper, and the column printed off the edge of the PDF.
 */
// Sized for the widest realistic amount, not the typical one: a 250-pod
// projection reaches eight figures, and the symbol may be a three-letter code
// (see pdfCurrency) rather than one glyph. The pod NAME absorbs the slack and
// truncates with an ellipsis; a clipped number would be a wrong number.
const MONEY_COLS = [
  { key: 'count', w: 28 },
  { key: 'spots', w: 34 },
  { key: 'collection', w: 74 },
  { key: 'gst', w: 68 },
  { key: 'venue', w: 64 },
  { key: 'host', w: 68 },
  { key: 'duncit', w: 68 },
] as const;

type MoneyCol = (typeof MONEY_COLS)[number]['key'];

interface Layout {
  x: Record<MoneyCol, number>;
  w: Record<MoneyCol, number>;
  /** Whatever is left for the pod name after the money columns are placed. */
  nameW: number;
}

/** Place the money columns by walking back from the right margin. */
function layoutOf(R: number): Layout {
  const x = {} as Record<MoneyCol, number>;
  const w = {} as Record<MoneyCol, number>;
  let edge = R;
  for (let i = MONEY_COLS.length - 1; i >= 0; i -= 1) {
    const col = MONEY_COLS[i];
    edge -= col.w;
    x[col.key] = edge;
    w[col.key] = col.w;
  }
  return { x, w, nameW: Math.max(60, edge - (L + PAD) - PAD) };
}


function drawHeader(doc: PDFKit.PDFDocument, d: PodCalculatorReportData, logo: Buffer | null, R: number) {
  doc.rect(0, 0, doc.page.width, 92).fill(ACCENT);
  if (logo) {
    try {
      doc.image(logo, L, 24, { fit: [140, 42], valign: 'center' });
    } catch {
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(d.business_name, L, 28);
    }
  } else {
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(d.business_name, L, 28);
  }
  doc
    .fillColor('#ffffff')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('POD PROFIT REPORT', L, 34, { width: R - L, align: 'right' });
}

function drawMeta(doc: PDFKit.PDFDocument, d: PodCalculatorReportData, R: number, y: number) {
  doc.fillColor(INK).fontSize(14).font('Helvetica-Bold').text(d.name, L, y, { width: 340 });
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(d.kind_label, L, doc.y + 2, { width: 340 });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text(`Generated: ${appDateTime(d.generated_at)}`, 360, y + 2, { width: R - 360, align: 'right' });
}

/** One right-aligned money cell, using the column's own width. */
function cell(
  doc: PDFKit.PDFDocument,
  lay: Layout,
  key: MoneyCol,
  text: string,
  y: number
): void {
  doc.text(text, lay.x[key], y, { width: lay.w[key], align: 'right', lineBreak: false });
}

function drawTableHead(doc: PDFKit.PDFDocument, lay: Layout, R: number, y: number): number {
  doc.rect(L, y, R - L, 22).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(7).font('Helvetica-Bold');
  doc.text('POD', L + PAD, y + 8, { width: lay.nameW, lineBreak: false });
  cell(doc, lay, 'count', 'QTY', y + 8);
  cell(doc, lay, 'spots', 'SPOTS', y + 8);
  cell(doc, lay, 'collection', 'COLLECTION', y + 8);
  cell(doc, lay, 'gst', 'GST', y + 8);
  cell(doc, lay, 'venue', 'VENUE', y + 8);
  cell(doc, lay, 'host', 'HOST', y + 8);
  cell(doc, lay, 'duncit', 'DUNCIT', y + 8);
  return y + 22;
}

function drawLine(
  doc: PDFKit.PDFDocument,
  lay: Layout,
  line: PodCalculatorLine,
  R: number,
  y: number,
  fmt: (n: number) => string
): number {
  doc.fillColor(INK).fontSize(8).font('Helvetica');
  doc.text(line.name || '-', L + PAD, y + 7, { width: lay.nameW, ellipsis: true, lineBreak: false });
  doc.fillColor(MUTED);
  cell(doc, lay, 'count', `x${line.pod_count}`, y + 7);
  cell(doc, lay, 'spots', String(line.payable_spots), y + 7);
  doc.fillColor(INK);
  cell(doc, lay, 'collection', fmt(line.collection_total), y + 7);
  cell(doc, lay, 'gst', fmt(line.gst_amount), y + 7);
  cell(doc, lay, 'venue', fmt(line.venue_receives), y + 7);
  cell(doc, lay, 'host', fmt(line.host_receives), y + 7);
  doc.fillColor(ACCENT).font('Helvetica-Bold');
  cell(doc, lay, 'duncit', fmt(line.duncit_revenue_total), y + 7);
  const next = y + 22;
  doc.moveTo(L, next).lineTo(R, next).strokeColor(LINE).lineWidth(0.5).stroke();
  return next;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  lay: Layout,
  t: PodCalculatorTotals,
  R: number,
  y: number,
  fmt: (n: number) => string
): number {
  doc.rect(L, y, R - L, 26).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  doc.text('GRAND TOTAL', L + PAD, y + 9, { width: lay.nameW, lineBreak: false });
  cell(doc, lay, 'count', `x${t.pods}`, y + 9);
  doc.fillColor(INK).fontSize(8);
  cell(doc, lay, 'collection', fmt(t.collection_total), y + 9);
  cell(doc, lay, 'gst', fmt(t.gst_amount), y + 9);
  cell(doc, lay, 'venue', fmt(t.venue_receives), y + 9);
  cell(doc, lay, 'host', fmt(t.host_receives), y + 9);
  doc.fillColor(ACCENT).fontSize(8.5);
  cell(doc, lay, 'duncit', fmt(t.duncit_revenue_total), y + 9);
  return y + 26;
}


/**
 * The costs each side carries, and what that leaves them.
 *
 * A block rather than three more table columns: the money columns already run
 * to the right margin on a 595pt page, and a clipped number is a wrong number.
 * Drawn only when something was actually spent, so a calculation with no
 * expenses reads exactly as it did before the feature existed.
 */
function drawCosts(
  doc: PDFKit.PDFDocument,
  t: PodCalculatorTotals,
  R: number,
  y: number,
  fmt: (n: number) => string
): number {
  if (t.expense_total <= 0) return y;

  const rows: readonly (readonly [string, number, number])[] = [
    ['Duncit', t.expenses.DUNCIT, t.duncit_net],
    ['Host', t.expenses.HOST, t.host_net],
    ['Venue', t.expenses.VENUE, t.venue_net],
  ];
  const half = (R - L) / 2;
  let top = y + 18;

  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text('COSTS & NET', L, top);
  top += 14;
  doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold');
  doc.text('BORNE BY', L + PAD, top, { width: half - PAD, lineBreak: false });
  doc.text('EXPENSES', L + half, top, { width: half / 2 - PAD, align: 'right', lineBreak: false });
  doc.text('NET', L + half + half / 2, top, { width: half / 2 - PAD, align: 'right', lineBreak: false });
  top += 12;

  for (const [label, spend, net] of rows) {
    doc.fillColor(INK).fontSize(8).font('Helvetica');
    doc.text(label, L + PAD, top, { width: half - PAD, lineBreak: false });
    doc.text(fmt(spend), L + half, top, { width: half / 2 - PAD, align: 'right', lineBreak: false });
    doc.font('Helvetica-Bold');
    doc.text(fmt(net), L + half + half / 2, top, {
      width: half / 2 - PAD,
      align: 'right',
      lineBreak: false,
    });
    top += 14;
    doc.moveTo(L, top - 3).lineTo(R, top - 3).strokeColor(LINE).lineWidth(0.5).stroke();
  }

  doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold');
  doc.text('TOTAL EXPENSES', L + PAD, top + 3, { width: half - PAD, lineBreak: false });
  doc.text(fmt(t.expense_total), L + half, top + 3, {
    width: half / 2 - PAD,
    align: 'right',
    lineBreak: false,
  });
  return top + 16;
}

/**
 * The standing disclaimer.
 *
 * Fixed rather than read from the invoice footer setting: this is an estimate,
 * and the invoice note says "computer-generated invoice ... does not require a
 * signature", which is exactly the wrong thing to print at the bottom of one.
 */
function drawFooter(doc: PDFKit.PDFDocument, R: number, y: number) {
  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .font('Helvetica')
    .text(
      'An estimate produced by the Pod Profit Calculator from the rates saved with this calculation. It is not an invoice and settles no payment.',
      L,
      y + 16,
      { align: 'center', width: R - L }
    );
}

/**
 * The saved calculation as a one-page report.
 *
 * Every figure comes from `lineFor`/`totalsOf`, which run the SAME
 * `computePodFinanceBreakdown` that quotes and settles real pods — so a report
 * a partner is emailed cannot disagree with the money they are actually paid.
 */
export async function generatePodCalculatorPdf(d: PodCalculatorReportData): Promise<Buffer> {
  const logo = await loadPdfImage(d.invoice_logo_url);

  return renderPdf((doc) => {
    const R = doc.page.width - L;
    const lay = layoutOf(R);
    const cur = pdfCurrency(d.currency_symbol);
    const fmt = (n: number) => `${cur}${n.toFixed(2)}`;

    drawHeader(doc, d, logo, R);
    drawMeta(doc, d, R, 112);

    let y = drawTableHead(doc, lay, R, Math.max(doc.y, 150) + 12);
    for (const line of d.lines) {
      // A long comparison runs past one page; carry the header over.
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = drawTableHead(doc, lay, R, 48);
      }
      y = drawLine(doc, lay, line, R, y, fmt);
    }

    let costsTop = drawTotals(doc, lay, d.totals, R, y + 6, fmt);
    // The costs block is ~90pt tall; start it on a fresh page rather than let
    // it run off the bottom of a long comparison.
    if (d.totals.expense_total > 0 && costsTop > doc.page.height - 140) {
      doc.addPage();
      costsTop = 48;
    }
    drawFooter(doc, R, drawCosts(doc, d.totals, R, costsTop, fmt));
  });
}
