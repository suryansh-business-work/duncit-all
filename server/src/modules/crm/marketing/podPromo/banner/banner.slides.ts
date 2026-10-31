import { M, brandLogo, footer, panelRadius, roomFor, startCanvas, type ImageSlot, type SlideContext, type SlidePlan } from './banner.layout';

/**
 * The pod's own slides: the cover, the details and the booking slide. The
 * host and venue slides are in banner.slides.partners.ts. Every block is
 * placed below the one before it, so a three-line title pushes the date down
 * instead of running into it, and a picture only goes where room is left.
 */
export function coverSlide(ctx: SlideContext): SlidePlan {
  const { width: W, height: H, family, palette, copy } = ctx;
  const full = family.cover_photo === 'full' && ctx.has.photo;
  const canvas = startCanvas(ctx, full);
  const images: ImageSlot[] = full ? [{ source: 'photo', x: 0, y: 0, w: W, h: H, shape: 'rect', fit: 'cover', layer: 'under' }] : [];
  const inner = W - 2 * M;

  let y = M + 100;
  y = canvas.text({ text: copy.kicker, role: family.body_font, size: 34, x: M, y, width: inner, maxLines: 1, fill: palette.accent, upper: true });
  y = canvas.text({
    text: copy.title,
    role: family.title_font,
    size: H > W ? 128 : 112,
    minSize: 64,
    x: M,
    y: y + 18,
    width: inner,
    maxLines: 3,
    fill: palette.ink,
    leading: 1.05,
    upper: family.upper_title,
  });
  y = canvas.text({ text: `${copy.weekday}, ${copy.date}`, role: family.body_font, size: 44, x: M, y: y + 28, width: inner, maxLines: 1, fill: palette.accent });
  y = canvas.text({ text: copy.time, role: family.body_font, size: 38, x: M, y: y + 10, width: inner, maxLines: 1, fill: palette.ink });
  y = canvas.text({ text: copy.place, role: family.body_font, size: 34, x: M, y: y + 10, width: inner, maxLines: 2, fill: palette.muted });

  const rowTop = H - M - 110;
  const panelTop = y + 36;
  const panelBottom = rowTop - 36;
  if (family.cover_photo === 'panel' && ctx.has.photo && roomFor(panelTop, panelBottom)) {
    images.push({ source: 'photo', x: M, y: panelTop, w: inner, h: panelBottom - panelTop, shape: 'round', radius: panelRadius(family.radius), fit: 'cover', layer: 'under' });
  }

  canvas.text({ text: copy.price, role: family.title_font, size: 84, minSize: 48, x: M, y: rowTop + 6, width: inner / 2, maxLines: 1, fill: palette.accent });
  canvas.pill(copy.cta, { role: 'sans_bold', size: 40, x: W - M, y: rowTop + 10, fill: palette.accent, ink: palette.accent_ink, radius: family.radius, align: 'right', maxWidth: inner / 2 });
  return { kind: 'COVER', background: palette.bg, svg: canvas.toString(), images: [...images, ...brandLogo(ctx)] };
}

export function detailsSlide(ctx: SlideContext): SlidePlan | null {
  const { width: W, height: H, family, palette, copy } = ctx;
  if (!copy.about && copy.includes.length === 0) return null;
  const canvas = startCanvas(ctx, false);
  const inner = W - 2 * M;
  let y = M + 100;
  if (copy.about) {
    y = canvas.text({ text: copy.about_heading, role: family.title_font, size: 72, minSize: 52, x: M, y, width: inner, maxLines: 1, fill: palette.accent, upper: family.upper_title });
    y = canvas.text({ text: copy.about, role: family.body_font, size: 38, x: M, y: y + 22, width: inner, maxLines: H > W ? 7 : 5, fill: palette.ink, leading: 1.35 });
    y += 40;
  }
  if (copy.includes.length > 0) {
    y = canvas.text({ text: copy.included_heading, role: family.title_font, size: 60, minSize: 44, x: M, y, width: inner, maxLines: 1, fill: palette.accent, upper: family.upper_title });
    y += 24;
    const floor = H - M - 90;
    for (const item of copy.includes) {
      if (y + 60 > floor) break;
      canvas.tick(M + 24, y + 22, 24, palette.accent, palette.accent_ink);
      y = canvas.text({ text: item, role: family.body_font, size: 36, x: M + 72, y, width: inner - 72, maxLines: 2, fill: palette.ink, leading: 1.25 }) + 18;
    }
  }
  footer(canvas, ctx, palette.muted);
  return { kind: 'DETAILS', background: palette.bg, svg: canvas.toString(), images: brandLogo(ctx) };
}

/** The QR code side: as large as the space allows, never under what a phone scans from a feed, never over 360. */
export const qrSize = (space: number) => Math.max(QR_MIN, Math.min(QR_MAX, Math.round(space)));
const QR_MIN = 200;
const QR_MAX = 360;

export function bookSlide(ctx: SlideContext): SlidePlan {
  const { width: W, height: H, family, palette, copy } = ctx;
  const canvas = startCanvas(ctx, false);
  const inner = W - 2 * M;
  let y = M + 100;
  y = canvas.text({ text: copy.book_heading, role: family.title_font, size: 84, minSize: 56, x: M, y, width: inner, maxLines: 2, fill: palette.ink, align: 'center', upper: family.upper_title });
  y = canvas.text({ text: copy.entry_label, role: family.body_font, size: 34, x: M, y: y + 24, width: inner, maxLines: 1, fill: palette.muted, align: 'center', upper: true });
  y = canvas.text({ text: copy.price, role: family.title_font, size: 150, minSize: 80, x: M, y: y + 8, width: inner, maxLines: 1, fill: palette.accent, align: 'center' });
  if (copy.price_detail !== copy.price) {
    y = canvas.text({ text: copy.price_detail, role: family.body_font, size: 32, x: M, y: y + 6, width: inner, maxLines: 2, fill: palette.ink, align: 'center' });
  }
  // What is left under the price for the code, its labels (about 150 px) and the pill (about 70 px).
  const qr = qrSize(H - M - 70 - 150 - (y + 36) - 40);
  const tile = qr + 40;
  const qrTop = y + 36;
  canvas.rect((W - tile) / 2, qrTop, tile, tile, palette.surface, { radius: Math.min(family.radius, 32) });
  const images: ImageSlot[] = [{ source: 'qr', x: (W - qr) / 2, y: qrTop + 20, w: qr, h: qr, shape: 'rect', fit: 'contain', layer: 'over' }];
  y = canvas.text({ text: copy.scan_label, role: family.body_font, size: 30, x: M, y: qrTop + tile + 20, width: inner, maxLines: 1, fill: palette.muted, align: 'center' });
  y = canvas.text({ text: copy.link_text, role: 'sans_bold', size: 44, minSize: 30, x: M, y: y + 8, width: inner, maxLines: 1, fill: palette.ink, align: 'center' });
  canvas.pill(copy.scarcity, { role: 'sans_bold', size: 32, x: W / 2, y: y + 24, fill: palette.accent, ink: palette.accent_ink, radius: family.radius, align: 'center', maxWidth: inner });
  return { kind: 'BOOK', background: palette.bg, svg: canvas.toString(), images: [...images, ...brandLogo(ctx)] };
}
