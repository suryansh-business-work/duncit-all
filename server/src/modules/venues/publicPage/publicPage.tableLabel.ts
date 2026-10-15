import { renderPdf } from '@services/pdf/document';
import { posterFonts, type PosterFonts } from './publicPage.poster.assets';
import { fitText } from './publicPage.poster.draw';
import { POSTER, POSTER_COLORS, TABLE_LABEL, tableLabelPage } from './publicPage.poster.layout';
import { drawScanPanel, posterQr } from './publicPage.poster.scan';

/**
 * The table label: the poster's red scan panel alone, with the venue's name
 * under it — small enough to stand on a table or stick beside the till.
 *
 * Its QR is the venue's own table link, so a scan at the table is counted apart
 * from a scan of the wall poster. The sheet is exactly the label, so it prints
 * at any size without cropping.
 */
export interface TableLabelData {
  title: string;
  url: string;
  /** Already translated by the caller — the server holds no localization. */
  headline: string;
}

/**
 * Per-table stickers: the same label, one page per table, each QR carrying its
 * table so the guest's checkout opens with it filled in. The printed pill keeps
 * the short link (`url`); only the QR holds the longer table address.
 */
export interface TableStickerData {
  url: string;
  headline: string;
  stickers: Array<{ qrUrl: string; caption: string }>;
}

type Doc = PDFKit.PDFDocument;

/** One label on the current page: the scan panel, then `caption` on one line under it. */
function drawLabel(doc: Doc, fonts: PosterFonts, qr: ReturnType<typeof posterQr>, copy: { headline: string; url: string }, caption: string) {
  const { margin, panelWidth, nameGap, nameHeight, nameMax, nameMin } = TABLE_LABEL;
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(POSTER_COLORS.paper);
  drawScanPanel(doc, fonts, qr, copy, { x: margin, top: margin, width: panelWidth });

  const name = fitText(doc, fonts.bold, caption, panelWidth, {
    max: nameMax,
    min: nameMin,
    lines: 1,
    lineGap: 0,
    maxHeight: nameHeight,
  });
  const top = margin + POSTER.panel.height + nameGap + (nameHeight - name.height) / 2;
  doc.font(fonts.bold).fontSize(name.size).fillColor(POSTER_COLORS.ink).text(caption, margin, top, {
    width: panelWidth,
    height: name.clip,
    align: 'center',
    ellipsis: true,
  });
}

export function renderVenueTableLabel(data: TableLabelData): Promise<Buffer> {
  const qr = posterQr(data.url);
  const page = tableLabelPage();
  return renderPdf(
    (doc) => drawLabel(doc, posterFonts(doc), qr, { headline: data.headline, url: data.url }, data.title),
    { size: [page.width, page.height] }
  );
}

/** Every table's sticker in one PDF, a page each, in the venue's table order. */
export function renderVenueTableStickers(data: TableStickerData): Promise<Buffer> {
  const page = tableLabelPage();
  return renderPdf(
    (doc) => {
      const fonts = posterFonts(doc);
      data.stickers.forEach((sticker, index) => {
        if (index > 0) doc.addPage({ size: [page.width, page.height], margin: 0 });
        drawLabel(doc, fonts, posterQr(sticker.qrUrl), { headline: data.headline, url: data.url }, sticker.caption);
      });
    },
    { size: [page.width, page.height] }
  );
}
