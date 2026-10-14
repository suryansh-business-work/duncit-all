import { renderPdf } from '@services/pdf/document';
import { posterFonts } from './publicPage.poster.assets';
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

export function renderVenueTableLabel(data: TableLabelData): Promise<Buffer> {
  const qr = posterQr(data.url);
  const page = tableLabelPage();
  return renderPdf(
    (doc) => {
      const fonts = posterFonts(doc);
      const { margin, panelWidth, nameGap, nameHeight, nameMax, nameMin } = TABLE_LABEL;
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(POSTER_COLORS.paper);
      drawScanPanel(doc, fonts, qr, { headline: data.headline, url: data.url }, { x: margin, top: margin, width: panelWidth });

      const name = fitText(doc, fonts.bold, data.title, panelWidth, {
        max: nameMax,
        min: nameMin,
        lines: 1,
        lineGap: 0,
        maxHeight: nameHeight,
      });
      const top = margin + POSTER.panel.height + nameGap + (nameHeight - name.height) / 2;
      doc.font(fonts.bold).fontSize(name.size).fillColor(POSTER_COLORS.ink).text(data.title, margin, top, {
        width: panelWidth,
        height: name.clip,
        align: 'center',
        ellipsis: true,
      });
    },
    { size: [page.width, page.height] }
  );
}
