import { loadPdfImage, renderPdf } from '@services/pdf/document';
import type { PodCalculatorLine, PodCalculatorTotals } from '@modules/finance/podCalculator/podCalculator.totals';

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
  invoice_footer_note?: string;
}

// Duncit brand palette — kept in lock-step with the invoice, payout and ticket PDFs.
const ACCENT = '#ff4f73';
const ACCENT_SOFT = '#fff1f4';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

const L = 40;

/** Column x-offsets, left to right. The pod name takes whatever is left. */
const COLS = { name: L + 6, count: 190, spots: 232, collection: 286, gst: 358, venue: 420, host: 482, duncit: 544 };


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
    .text(`Generated: ${d.generated_at.toLocaleString('en-IN')}`, 360, y + 2, { width: R - 360, align: 'right' });
}

function drawTableHead(doc: PDFKit.PDFDocument, R: number, y: number): number {
  doc.rect(L, y, R - L, 22).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(7.5).font('Helvetica-Bold');
  doc.text('POD', COLS.name, y + 7, { width: 130 });
  doc.text('QTY', COLS.count, y + 7, { width: 36, align: 'right' });
  doc.text('SPOTS', COLS.spots, y + 7, { width: 44, align: 'right' });
  doc.text('COLLECTION', COLS.collection, y + 7, { width: 64, align: 'right' });
  doc.text('GST', COLS.gst, y + 7, { width: 54, align: 'right' });
  doc.text('VENUE', COLS.venue, y + 7, { width: 54, align: 'right' });
  doc.text('HOST', COLS.host, y + 7, { width: 54, align: 'right' });
  doc.text('DUNCIT', COLS.duncit, y + 7, { width: 54, align: 'right' });
  return y + 22;
}

function drawLine(
  doc: PDFKit.PDFDocument,
  line: PodCalculatorLine,
  R: number,
  y: number,
  fmt: (n: number) => string
): number {
  doc.fillColor(INK).fontSize(8.5).font('Helvetica');
  doc.text(line.name || '—', COLS.name, y + 6, { width: 130, ellipsis: true, lineBreak: false });
  doc.fillColor(MUTED).text(`x${line.pod_count}`, COLS.count, y + 6, { width: 36, align: 'right' });
  doc.text(String(line.payable_spots), COLS.spots, y + 6, { width: 44, align: 'right' });
  doc.fillColor(INK);
  doc.text(fmt(line.collection_total), COLS.collection, y + 6, { width: 64, align: 'right' });
  doc.text(fmt(line.gst_amount), COLS.gst, y + 6, { width: 54, align: 'right' });
  doc.text(fmt(line.venue_receives), COLS.venue, y + 6, { width: 54, align: 'right' });
  doc.text(fmt(line.host_receives), COLS.host, y + 6, { width: 54, align: 'right' });
  doc.fillColor(ACCENT).font('Helvetica-Bold');
  doc.text(fmt(line.duncit_revenue_total), COLS.duncit, y + 6, { width: 54, align: 'right' });
  const next = y + 22;
  doc.moveTo(L, next).lineTo(R, next).strokeColor(LINE).lineWidth(0.5).stroke();
  return next;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  t: PodCalculatorTotals,
  R: number,
  y: number,
  fmt: (n: number) => string
): number {
  doc.rect(L, y, R - L, 26).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(9).font('Helvetica-Bold');
  doc.text('GRAND TOTAL', COLS.name, y + 9, { width: 130 });
  doc.text(`x${t.pods}`, COLS.count, y + 9, { width: 36, align: 'right' });
  doc.fillColor(INK).fontSize(8.5);
  doc.text(fmt(t.collection_total), COLS.collection, y + 9, { width: 64, align: 'right' });
  doc.text(fmt(t.gst_amount), COLS.gst, y + 9, { width: 54, align: 'right' });
  doc.text(fmt(t.venue_receives), COLS.venue, y + 9, { width: 54, align: 'right' });
  doc.text(fmt(t.host_receives), COLS.host, y + 9, { width: 54, align: 'right' });
  doc.fillColor(ACCENT).fontSize(9);
  doc.text(fmt(t.duncit_revenue_total), COLS.duncit, y + 9, { width: 54, align: 'right' });
  return y + 26;
}

function drawFooter(doc: PDFKit.PDFDocument, d: PodCalculatorReportData, R: number, y: number) {
  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .font('Helvetica')
    .text(
      d.invoice_footer_note ||
        'An estimate produced by the Pod Profit Calculator using the live finance rates entered above. It is not an invoice and does not settle any payment.',
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
      const R = doc.page.width - 40;
      const fmt = (n: number) => `${d.currency_symbol}${n.toFixed(2)}`;

      drawHeader(doc, d, logo, R);
      drawMeta(doc, d, R, 112);

      let y = drawTableHead(doc, R, Math.max(doc.y, 150) + 12);
      for (const line of d.lines) {
        // A long comparison runs past one page; carry the header over.
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = drawTableHead(doc, R, 48);
        }
        y = drawLine(doc, line, R, y, fmt);
      }

      drawFooter(doc, d, R, drawTotals(doc, d.totals, R, y + 6, fmt));
  });
}
