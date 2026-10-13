import QRCode from 'qrcode';
import type { PosterFonts } from './publicPage.poster.assets';
import { fitText, writeText } from './publicPage.poster.draw';
import {
  POSTER,
  POSTER_COLORS,
  QR_QUIET_MODULES,
  displayUrl,
  fitFontSize,
  qrRuns,
} from './publicPage.poster.layout';

/**
 * The scan panel — the poster's one block of brand red: what to do (the
 * headline), where it goes (the link, typed out for anyone without a camera)
 * and the code itself on a white card.
 */
type Doc = PDFKit.PDFDocument;

/** The QR symbol for the link. Level Q survives a quarter of it being scuffed. */
export function posterQr(url: string): QRCode.QRCode {
  return QRCode.create(url, { errorCorrectionLevel: 'Q' });
}

/** Tone-on-tone rings rising from the panel's corner. */
function drawRings(doc: Doc, x: number, bottom: number): void {
  doc.save();
  doc.strokeOpacity(0.09).strokeColor(POSTER_COLORS.paper).lineWidth(26);
  for (const radius of [96, 164, 232]) doc.circle(x, bottom, radius).stroke();
  doc.restore();
}

/** A camera viewfinder: four corner brackets that read as "scan" in any language. */
function drawViewfinder(doc: Doc, x: number, y: number, size: number): void {
  const arm = size * 0.34;
  doc.save();
  doc.lineWidth(3).lineCap('round').lineJoin('round').strokeColor(POSTER_COLORS.paper);
  const corners: Array<[number, number, number, number]> = [
    [x, y, 1, 1],
    [x + size, y, -1, 1],
    [x, y + size, 1, -1],
    [x + size, y + size, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    doc
      .moveTo(cx + arm * dx, cy)
      .lineTo(cx, cy)
      .lineTo(cx, cy + arm * dy)
      .stroke();
  }
  doc.restore();
}

/** The code as vector modules on its white card, quiet zone included. */
function drawQrCard(doc: Doc, qr: QRCode.QRCode, x: number, y: number): void {
  const { card, cardRadius } = POSTER.panel;
  doc.roundedRect(x, y, card, card, cardRadius).fill(POSTER_COLORS.paper);
  const { size, data } = qr.modules;
  const module = card / (size + QR_QUIET_MODULES * 2);
  const origin = QR_QUIET_MODULES * module;
  for (const run of qrRuns(size, data)) {
    doc.rect(x + origin + run.col * module, y + origin + run.row * module, run.length * module, module);
  }
  doc.fill(POSTER_COLORS.qr);
}

/** The link in a white pill, shrunk to fit and clipped only as a last resort. */
function drawUrlPill(doc: Doc, fonts: PosterFonts, url: string, x: number, y: number, maxWidth: number): void {
  const spec = POSTER.panel;
  const shown = displayUrl(url);
  const room = maxWidth - spec.pillPadX * 2;
  doc.font(fonts.bold);
  const size = fitFontSize(
    spec.urlMax,
    spec.urlMin,
    (candidate) => doc.fontSize(candidate).widthOfString(shown) <= room,
    0.5,
  );
  doc.fontSize(size);
  const textWidth = Math.min(room, doc.widthOfString(shown));
  const line = doc.currentLineHeight(true);
  doc
    .roundedRect(x, y, textWidth + spec.pillPadX * 2, spec.pillHeight, spec.pillHeight / 2)
    .fill(POSTER_COLORS.paper);
  doc.fillColor(POSTER_COLORS.ink).text(shown, x + spec.pillPadX, y + (spec.pillHeight - line) / 2, {
    // A hair of slack, so rounding never wraps a link that measured as fitting.
    width: textWidth + 1,
    height: line + 1,
    ellipsis: true,
  });
}

export function drawScanPanel(
  doc: Doc,
  fonts: PosterFonts,
  qr: QRCode.QRCode,
  copy: { headline: string; url: string },
): void {
  const spec = POSTER.panel;
  const x = POSTER.margin;
  const width = doc.page.width - POSTER.margin * 2;
  const bottom = spec.top + spec.height;

  doc.save();
  doc.roundedRect(x, spec.top, width, spec.height, spec.radius).clip();
  doc.rect(x, spec.top, width, spec.height).fill(POSTER_COLORS.brand);
  drawRings(doc, x, bottom);
  doc.restore();

  const cardX = x + width - spec.cardInset - spec.card;
  drawQrCard(doc, qr, cardX, spec.top + spec.cardInset);

  const textX = x + spec.padX;
  const textWidth = cardX - spec.columnGap - textX;
  const pillY = bottom - spec.padY - spec.pillHeight;
  drawViewfinder(doc, textX + 1.5, spec.top + spec.padY + 1.5, spec.icon);

  const headlineY = spec.top + spec.padY + spec.icon + spec.iconGap;
  const room = pillY - spec.pillGap - headlineY;
  const headline = fitText(doc, fonts.bold, copy.headline, textWidth, {
    max: spec.headlineMax,
    min: spec.headlineMin,
    lines: spec.headlineLines,
    maxHeight: room,
    lineGap: spec.headlineLineGap,
  });
  writeText(doc, fonts.bold, POSTER_COLORS.paper, copy.headline, { x: textX, y: headlineY, width: textWidth }, headline);
  drawUrlPill(doc, fonts, copy.url, textX, pillY, textWidth);
}
