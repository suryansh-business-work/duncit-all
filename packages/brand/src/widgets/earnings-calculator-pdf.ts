/**
 * The earnings estimate as a real A4 file, drawn rather than screenshotted:
 * vector text stays sharp and selectable, and the layout is designed for a
 * page instead of squeezed from one.
 */
import { pdfText, type JsPdfCtor, type PdfDoc, type PdfLogo } from './earnings-calculator-pdf-lib';
import type { EarnSnapshot } from './earnings-calculator-types';

type Rgb = readonly [number, number, number];

// A4 in millimetres, and the palette the site uses on screen.
const PAGE = { width: 210, height: 297, margin: 16 };
const RIGHT = PAGE.width - PAGE.margin;
const INK: Rgb = [22, 19, 26];
const SOFT: Rgb = [110, 104, 118];
const BRAND: Rgb = [255, 79, 115];
const HAIRLINE: Rgb = [228, 226, 232];
const PANEL: Rgb = [255, 236, 241];
/** Drawn when the logo could not be fetched — the wordmark still signs the page. */
const WORDMARK = 'duncit';
const AUTHOR = 'Duncit';

interface Pen {
  at: () => number;
  down: (mm: number) => void;
  /** Break the page first when `mm` more would run off the sheet. */
  room: (mm: number) => void;
}

const makePen = (doc: PdfDoc): Pen => {
  let y = PAGE.margin;
  return {
    at: () => y,
    down: (mm) => {
      y += mm;
    },
    room: (mm) => {
      if (y + mm <= PAGE.height - PAGE.margin) return;
      doc.addPage();
      y = PAGE.margin;
    },
  };
};

const drawHeading = (doc: PdfDoc, pen: Pen, text: string) => {
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...SOFT);
  doc.text(pdfText(text).toUpperCase(), PAGE.margin, pen.at());
  pen.down(6);
};

const drawMasthead = (doc: PdfDoc, pen: Pen, logo: PdfLogo | null, snap: EarnSnapshot) => {
  if (logo) {
    const height = 14;
    doc.addImage(logo.dataUrl, logo.format, PAGE.margin, pen.at(), (logo.w / logo.h) * height, height);
    pen.down(height + 8);
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...BRAND);
    doc.text(WORDMARK, PAGE.margin, pen.at() + 7);
    pen.down(16);
  }
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...INK);
  doc.text(pdfText(snap.copy.pdf.title), PAGE.margin, pen.at() + 6);
  pen.down(12);
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...BRAND);
  doc.text(pdfText(snap.role.name).toUpperCase(), PAGE.margin, pen.at());
  pen.down(4);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(PAGE.margin, pen.at(), RIGHT, pen.at());
  pen.down(10);
};

/** A titled block of term/value lines, each closed by a hairline. */
const drawBlock = (doc: PdfDoc, pen: Pen, title: string, lines: [string, string][]) => {
  pen.room(12 + lines.length * 9);
  drawHeading(doc, pen, title);
  doc.setFontSize(11);
  for (const [term, value] of lines) {
    doc.setFont('helvetica', 'normal').setTextColor(...INK);
    doc.text(pdfText(term), PAGE.margin, pen.at());
    doc.setFont('helvetica', 'bold');
    doc.text(pdfText(value), RIGHT, pen.at(), { align: 'right' });
    pen.down(3);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, pen.at(), RIGHT, pen.at());
    pen.down(6);
  }
  pen.down(4);
};

/** The answer, in the one box the eye lands on. */
const drawTakeHome = (doc: PdfDoc, pen: Pen, snap: EarnSnapshot) => {
  pen.room(26);
  doc.setFillColor(...PANEL);
  doc.roundedRect(PAGE.margin, pen.at(), RIGHT - PAGE.margin, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...SOFT);
  doc.text(pdfText(snap.role.takeHomeLabel), PAGE.margin + 6, pen.at() + 8);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...INK);
  doc.text(pdfText(snap.takeHome), RIGHT - 6, pen.at() + 14, { align: 'right' });
  pen.down(30);
};

const drawDuties = (doc: PdfDoc, pen: Pen, snap: EarnSnapshot) => {
  pen.room(20);
  drawHeading(doc, pen, snap.role.dutiesTitle);
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...INK);
  for (const duty of snap.role.duties) {
    const wrapped = doc.splitTextToSize(pdfText(duty), RIGHT - PAGE.margin - 6);
    pen.room(wrapped.length * 5 + 2);
    doc.setFillColor(...BRAND);
    doc.circle(PAGE.margin + 1.2, pen.at() - 1.2, 0.9, 'F');
    doc.text(wrapped, PAGE.margin + 6, pen.at());
    pen.down(wrapped.length * 5 + 1);
  }
  pen.down(6);
};

const drawSmallPrint = (doc: PdfDoc, pen: Pen, snap: EarnSnapshot) => {
  const wrapped = doc.splitTextToSize(pdfText(snap.copy.disclaimer), RIGHT - PAGE.margin);
  pen.room(wrapped.length * 4.5 + 8);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SOFT);
  doc.text(wrapped, PAGE.margin, pen.at());
  pen.down(wrapped.length * 4.5 + 3);
  const printed = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(pdfText(`${snap.copy.pdf.footer} ${printed}`), PAGE.margin, pen.at());
};

/** The inputs this role actually used, as the sliders show them. */
const inputLines = (snap: EarnSnapshot): [string, string][] =>
  snap.fields
    .filter((field) => !field.roles || field.roles.includes(snap.role.key))
    .map((field) => [field.label, `${field.prefix ?? ''}${snap.sliderValue(field.name).toLocaleString('en-IN')}`]);

export function buildEstimatePdf(JsPDF: JsPdfCtor, logo: PdfLogo | null, snap: EarnSnapshot): PdfDoc {
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `${snap.copy.pdf.title}: ${snap.role.name}`, author: AUTHOR });
  const pen = makePen(doc);
  drawMasthead(doc, pen, logo, snap);
  drawBlock(doc, pen, snap.copy.pdf.inputsTitle, inputLines(snap));
  drawBlock(
    doc,
    pen,
    snap.copy.pdf.breakdownTitle,
    snap.role.rows.map((key) => [snap.rowLabels[key], snap.rowText(key)])
  );
  drawTakeHome(doc, pen, snap);
  drawDuties(doc, pen, snap);
  drawSmallPrint(doc, pen, snap);
  return doc;
}
