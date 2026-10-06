import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { PDF_PALETTE, loadPdfImage, renderPdf } from '@services/pdf/document';
import { jpegSourceUrl } from '@utils/url';

/**
 * The printable A4 poster for a published venue or host page: the place (or
 * the person), a photo, and a large QR that opens the tracked page — made to
 * be stuck on a wall at the venue or handed out at a pod.
 *
 * The words come from the caller, already translated: the server holds no
 * localization of its own, and a poster is printed in the owner's language.
 */
export interface PosterCopy {
  headline: string;
  footer: string;
}

export interface PosterData {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  url: string;
  copy: PosterCopy;
}

const BAND = 64;
const HERO = 300;
const QR_SIZE = 210;
const SIDE = 48;

// The white brand mark the ticket band uses, loaded once.
const BRAND_MARK: Buffer | null = (() => {
  try {
    return fs.readFileSync(path.resolve(__dirname, '../../../services/_assets/duncit-mark-white.png'));
  } catch {
    return null;
  }
})();

/** pdfkit throws on an image format it cannot decode; decoration never fails the poster. */
function tryImage(doc: PDFKit.PDFDocument, draw: () => void): void {
  try {
    draw();
  } catch {
    // A missing picture leaves the soft block behind it — still a valid poster.
  }
}

function drawBand(doc: PDFKit.PDFDocument, width: number): void {
  doc.rect(0, 0, width, BAND).fill(PDF_PALETTE.accent);
  if (BRAND_MARK) {
    const mark = BRAND_MARK;
    tryImage(doc, () => doc.image(mark, (width - 36) / 2, 14, { fit: [36, 36] }));
  }
}

function drawHero(doc: PDFKit.PDFDocument, width: number, image: Buffer | null): void {
  doc.rect(0, BAND, width, HERO).fill(PDF_PALETTE.accentSoft);
  if (!image) return;
  doc.save();
  doc.rect(0, BAND, width, HERO).clip();
  tryImage(doc, () =>
    doc.image(image, 0, BAND, { cover: [width, HERO], align: 'center', valign: 'center' }),
  );
  doc.restore();
}

function drawText(doc: PDFKit.PDFDocument, data: PosterData, width: number): number {
  const textWidth = width - SIDE * 2;
  doc
    .fillColor(PDF_PALETTE.ink)
    .font('Helvetica-Bold')
    .fontSize(28)
    .text(data.title, SIDE, BAND + HERO + 24, { width: textWidth, align: 'center', height: 70, ellipsis: true });
  if (data.subtitle) {
    doc
      .fillColor(PDF_PALETTE.muted)
      .font('Helvetica')
      .fontSize(13)
      .text(data.subtitle, SIDE, doc.y + 4, { width: textWidth, align: 'center', height: 36, ellipsis: true });
  }
  doc
    .fillColor(PDF_PALETTE.accent)
    .font('Helvetica-Bold')
    .fontSize(15)
    .text(data.copy.headline, SIDE, doc.y + 14, { width: textWidth, align: 'center', height: 40, ellipsis: true });
  return doc.y + 12;
}

function drawQr(doc: PDFKit.PDFDocument, qr: Buffer, url: string, width: number, top: number): void {
  const frame = QR_SIZE + 24;
  const left = (width - frame) / 2;
  doc.roundedRect(left, top, frame, frame, 14).lineWidth(3).strokeColor(PDF_PALETTE.accent).stroke();
  doc.image(qr, left + 12, top + 12, { width: QR_SIZE, height: QR_SIZE });
  doc
    .fillColor(PDF_PALETTE.ink)
    .font('Helvetica')
    .fontSize(12)
    .text(url, SIDE, top + frame + 10, { width: width - SIDE * 2, align: 'center' });
}

function drawFooter(doc: PDFKit.PDFDocument, footer: string, width: number, height: number): void {
  doc.rect(0, height - 52, width, 52).fill(PDF_PALETTE.accent);
  doc
    .fillColor(PDF_PALETTE.paper)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(footer, SIDE, height - 33, { width: width - SIDE * 2, align: 'center', height: 20, ellipsis: true });
}

/** The poster as PDF bytes. The QR and the photo are fetched before drawing. */
export async function renderPublicPagePoster(data: PosterData): Promise<Buffer> {
  const [qr, image] = await Promise.all([
    QRCode.toBuffer(data.url, { margin: 1, width: 640, errorCorrectionLevel: 'M' }),
    loadPdfImage(data.image_url ? jpegSourceUrl(data.image_url) : undefined),
  ]);
  return renderPdf((doc) => {
    const width = doc.page.width;
    const height = doc.page.height;
    doc.rect(0, 0, width, height).fill(PDF_PALETTE.paper);
    drawBand(doc, width);
    drawHero(doc, width, image);
    const qrTop = drawText(doc, data, width);
    drawQr(doc, qr, data.url, width, qrTop);
    drawFooter(doc, data.copy.footer, width, height);
  });
}
