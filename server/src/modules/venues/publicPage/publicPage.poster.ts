import { loadPdfImage, renderPdf } from '@services/pdf/document';
import { jpegSourceUrl } from '@utils/url';
import { posterFonts } from './publicPage.poster.assets';
import { drawBrandRow, drawFooter, drawHero, drawTitle, measureTitle } from './publicPage.poster.draw';
import { POSTER, POSTER_COLORS } from './publicPage.poster.layout';
import { drawScanPanel, posterQr } from './publicPage.poster.scan';

/**
 * The printable A4 poster for a published venue or host page: the place (or
 * the person), a photo, and a large QR that opens the tracked page — made to
 * be stuck on a wall at the venue or handed out at a pod.
 *
 * Print first: white paper, a safe margin, the Duncit wordmark top and bottom,
 * and the brand red kept to one panel around the code. The measurements are in
 * `publicPage.poster.layout`, the pieces in `.draw` and `.scan`.
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

/** The poster as PDF bytes. The QR and the photo are prepared before drawing. */
export async function renderPublicPagePoster(data: PosterData): Promise<Buffer> {
  const qr = posterQr(data.url);
  const image = await loadPdfImage(data.image_url ? jpegSourceUrl(data.image_url) : undefined);
  return renderPdf((doc) => {
    const { margin, hero, title, panel } = POSTER;
    const width = doc.page.width - margin * 2;
    const fonts = posterFonts(doc);
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(POSTER_COLORS.paper);
    drawBrandRow(doc);

    // The panel and the footer are fixed; the name is measured, and the photo
    // takes the space that is left — so a long name shortens the photo
    // instead of pushing anything off the sheet.
    const block = measureTitle(doc, fonts, data.title, data.subtitle, width);
    const titleTop = panel.top - title.gapBelow - block.height;
    const heroBox = { x: margin, y: hero.top, width, height: titleTop - title.gapAbove - hero.top };
    drawHero(doc, heroBox, image, data.title, fonts);
    drawTitle(doc, fonts, block, data, { x: margin, y: titleTop, width });
    drawScanPanel(doc, fonts, qr, { headline: data.copy.headline, url: data.url });
    drawFooter(doc, fonts, data.copy.footer);
  });
}
