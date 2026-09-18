import { loadPdfImage, renderPdf } from '@services/pdf/document';
import type { ReportCopy } from './analyticsMail.copy';
import type { AnalyticsReport, ReportKpi, ReportSection, ReportTable } from './analyticsMail.report';
import type { DeltaTone } from './analyticsMail.format';

/**
 * The report as the PDF attached to every analytics mail: a cover band, the
 * period, then each dashboard — its tiles two to a row and its ranking as a
 * table. The same `AnalyticsReport` the mail body is drawn from, so the two
 * never disagree.
 *
 * Colours are chosen for contrast (white on the band, AA text on white), and a
 * change is written signed, so it never rests on colour alone.
 */

const ACCENT = '#b91c1c';
const ACCENT_SOFT = '#fef2f2';
const INK = '#111827';
const MUTED = '#4b5563';
const LINE = '#e5e7eb';
const TONE: Record<DeltaTone, string> = { good: '#15803d', bad: '#b91c1c', flat: MUTED };

const L = 40;
const R = 555;
const TOP = 48;
/** Room kept free at the foot of every page. */
const FOOT = 56;
const PAD = 8;
const KPI_H = 46;
const ROW_H = 18;
const VALUE_W = 64;
const RANK_W = 22;

export interface ReportPdfInput {
  report: AnalyticsReport;
  copy: ReportCopy;
  recipient: string;
  brandName: string;
  logoUrl?: string;
}

/** A fresh page when `needed` points will not fit below `y`; the y to draw at either way. */
function room(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed <= doc.page.height - FOOT) return y;
  doc.addPage();
  return TOP;
}

function drawHeader(doc: PDFKit.PDFDocument, input: ReportPdfInput, logo: Buffer | null): void {
  doc.rect(0, 0, doc.page.width, 88).fill(ACCENT);
  let drewLogo = false;
  if (logo) {
    try {
      doc.image(logo, L, 22, { fit: [140, 44], valign: 'center' });
      drewLogo = true;
    } catch {
      // A logo pdfkit cannot decode is decoration; the brand name stands in.
    }
  }
  if (!drewLogo) doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(input.brandName, L, 32);
  doc
    .fillColor('#ffffff')
    .fontSize(15)
    .font('Helvetica-Bold')
    .text(input.copy.t('email.analyticsReport.pdfHeading'), L, 36, { width: R - L, align: 'right' });
}

function drawMeta(doc: PDFKit.PDFDocument, input: ReportPdfInput, y: number): number {
  const { report, copy } = input;
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text(report.title, L, y, { width: R - L });
  const lines = [
    `${copy.t('email.analyticsReport.periodLabel')}: ${report.period}`,
    `${copy.t('email.analyticsReport.generatedLabel')}: ${report.generated}`,
    `${copy.t('email.analyticsReport.preparedFor')}: ${input.recipient}`,
  ];
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  for (const line of lines) doc.text(line, L, doc.y + 3, { width: R - L });
  return doc.y + 18;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  const top = room(doc, y, 24 + KPI_H);
  doc.rect(L, top, R - L, 24).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold').text(title, L + PAD, top + 7, { width: R - L - PAD * 2 });
  return top + 32;
}

function drawKpi(doc: PDFKit.PDFDocument, kpi: ReportKpi, x: number, y: number, width: number): void {
  const inner = width - PAD * 2;
  doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(kpi.title, x + PAD, y + 4, {
    width: inner,
    ellipsis: true,
    lineBreak: false,
  });
  doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(kpi.value, x + PAD, y + 16, { width: inner, lineBreak: false });
  doc.fillColor(kpi.tone ? TONE[kpi.tone] : MUTED).fontSize(7.5).font('Helvetica').text(kpi.change, x + PAD, y + 32, {
    width: inner,
    ellipsis: true,
    lineBreak: false,
  });
}

function drawKpis(doc: PDFKit.PDFDocument, kpis: readonly ReportKpi[], y: number): number {
  const half = (R - L) / 2;
  let top = y;
  for (let i = 0; i < kpis.length; i += 2) {
    top = room(doc, top, KPI_H);
    drawKpi(doc, kpis[i], L, top, half);
    if (kpis[i + 1]) drawKpi(doc, kpis[i + 1], L + half, top, half);
    doc.moveTo(L, top + KPI_H - 2).lineTo(R, top + KPI_H - 2).strokeColor(LINE).lineWidth(0.5).stroke();
    top += KPI_H;
  }
  return top + 6;
}

function drawTableRow(doc: PDFKit.PDFDocument, cells: readonly string[], rank: string, y: number, nameW: number): void {
  const [name, ...values] = cells;
  doc.text(rank, L + PAD, y + 5, { width: RANK_W, lineBreak: false });
  doc.text(name, L + PAD + RANK_W, y + 5, { width: nameW, ellipsis: true, lineBreak: false });
  values.forEach((value, index) => {
    const x = R - PAD - (values.length - index) * VALUE_W;
    doc.text(value, x, y + 5, { width: VALUE_W, align: 'right', ellipsis: true, lineBreak: false });
  });
}

function drawTable(doc: PDFKit.PDFDocument, table: ReportTable, input: ReportPdfInput, y: number): number {
  if (table.rows.length === 0) return y;
  const nameW = R - L - PAD * 2 - RANK_W - table.columns.length * VALUE_W;
  let top = room(doc, y, 20 + ROW_H * 2);
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text(table.title, L, top);
  top += 16;
  doc.rect(L, top, R - L, ROW_H).fill(ACCENT_SOFT);
  doc.fillColor(ACCENT).fontSize(7).font('Helvetica-Bold');
  drawTableRow(doc, [input.copy.t('email.analyticsReport.nameColumn'), ...table.columns], '#', top, nameW);
  top += ROW_H;
  table.rows.forEach((row, index) => {
    top = room(doc, top, ROW_H);
    doc.fillColor(INK).fontSize(7.5).font('Helvetica');
    drawTableRow(doc, [row.name, ...row.values], String(index + 1), top, nameW);
    doc.moveTo(L, top + ROW_H).lineTo(R, top + ROW_H).strokeColor(LINE).lineWidth(0.5).stroke();
    top += ROW_H;
  });
  return top + 12;
}

function drawSection(doc: PDFKit.PDFDocument, section: ReportSection, input: ReportPdfInput, y: number): number {
  let top = drawSectionTitle(doc, section.title, y);
  if (section.error) {
    doc.fillColor(ACCENT).fontSize(9).font('Helvetica').text(section.error, L, top, { width: R - L });
    return doc.y + 16;
  }
  top = drawKpis(doc, section.kpis, top);
  if (section.table) top = drawTable(doc, section.table, input, top);
  return top + 8;
}

function drawClosing(doc: PDFKit.PDFDocument, input: ReportPdfInput, y: number): void {
  const top = room(doc, y, 40);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(input.copy.t('email.analyticsReport.pdfClosing'), L, top, {
    width: R - L,
  });
  doc.fillColor(ACCENT).font('Helvetica-Bold').text(input.report.url, L, doc.y + 4, {
    width: R - L,
    link: input.report.url,
    underline: true,
  });
}

export async function analyticsReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const logo = await loadPdfImage(input.logoUrl);
  return renderPdf((doc) => {
    drawHeader(doc, input, logo);
    let y = drawMeta(doc, input, 112);
    for (const section of input.report.sections) y = drawSection(doc, section, input, y);
    drawClosing(doc, input, y);
  });
}
